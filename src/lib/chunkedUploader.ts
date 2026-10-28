/**
 * Client Chunk Uploader Helper
 * Bypasses Vercel's 4.5 MB serverless function payload limit by splitting files
 * into 2 MB chunks in the browser and assembling them on the server into Neon Postgres.
 * Supports uploads up to 100 MB with progress tracking.
 */

export interface ChunkedUploadOptions {
  file: File | Blob;
  purpose: "portfolio" | "media" | "package";
  metadata?: Record<string, unknown>;
  onProgress?: (progress: number, details: { part: number; totalParts: number }) => void;
  filename?: string;
}

export interface ChunkedUploadResponse<T = unknown> {
  ok: boolean;
  data?: T;
  portfolio?: unknown;
  subdomain?: string;
  url?: string;
  localUrl?: string;
  fileCount?: number;
  totalSize?: number;
  error?: string;
}

export const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per chunk (well within Vercel's 4.5 MB limit)
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB limit

export async function uploadChunked<T = unknown>({
  file,
  purpose,
  metadata = {},
  onProgress,
  filename,
}: ChunkedUploadOptions): Promise<ChunkedUploadResponse<T>> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 100 MB maximum limit.`
    );
  }

  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }

  const resolvedFilename =
    filename ||
    (file instanceof File ? file.name : (metadata.filename as string | undefined)) ||
    "upload.bin";

  const totalParts = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const uploadId = `upl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  // Upload each part
  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunkBlob = file.slice(start, end);

    let partSuccess = false;
    let lastError: Error | null = null;

    // Retry up to 3 times per part for network resilience
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("partNumber", String(partNumber));
        formData.append("totalParts", String(totalParts));
        formData.append("action", "part");
        formData.append("purpose", purpose);
        formData.append("chunk", chunkBlob, `${resolvedFilename}.part${partNumber}`);

        const res = await fetch("/api/upload/chunk", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Part ${partNumber} failed with status ${res.status}`);
        }

        partSuccess = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 400 * attempt));
        }
      }
    }

    if (!partSuccess) {
      throw lastError || new Error(`Upload failed at chunk ${partNumber} of ${totalParts}`);
    }

    if (onProgress) {
      // Progress across parts (0% to ~95%)
      const progressFraction = Math.min(0.95, partNumber / (totalParts + 0.2));
      onProgress(progressFraction, { part: partNumber, totalParts });
    }
  }

  // Complete action: assemble chunks and execute purpose handler
  const completeFormData = new FormData();
  completeFormData.append("uploadId", uploadId);
  completeFormData.append("totalParts", String(totalParts));
  completeFormData.append("action", "complete");
  completeFormData.append("purpose", purpose);
  completeFormData.append(
    "metadata",
    JSON.stringify({
      ...metadata,
      filename: resolvedFilename,
    })
  );

  const completeRes = await fetch("/api/upload/chunk", {
    method: "POST",
    body: completeFormData,
  });

  const completeData = await completeRes.json().catch(() => ({}));

  if (!completeRes.ok || !completeData.ok) {
    throw new Error(completeData.error || `Finalizing upload failed (${completeRes.status})`);
  }

  if (onProgress) {
    onProgress(1.0, { part: totalParts, totalParts });
  }

  return completeData as ChunkedUploadResponse<T>;
}
