"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Trash2,
  Folder,
  FileCode,
  RefreshCw,
  FileArchive,
  ArrowRight,
  Eye,
  Check,
  Server,
  Sparkles,
} from "lucide-react";
import { uploadChunked } from "@/lib/chunkedUploader";

interface TeamPortfolio {
  id: number;
  staffId: string;
  subdomain: string;
  title: string | null;
  entryFile: string;
  fileCount: number;
  totalSizeBytes: number;
  isActive: boolean;
  deployedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioManagerProps {
  staff?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function PortfolioManager({ staff }: PortfolioManagerProps) {
  const [portfolio, setPortfolio] = useState<TeamPortfolio | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<{ count: number; size: number; name: string } | null>(null);

  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const stagedDataRef = useRef<FormData | null>(null);
  const stagedZipFileRef = useRef<File | null>(null);
  const stagedFolderFilesRef = useRef<{ files: File[]; paths: string[] } | null>(null);

  // Load existing portfolio on mount
  useEffect(() => {
    let mounted = true;
    async function loadPortfolio() {
      try {
        setLoading(true);
        const res = await fetch("/api/portfolio/me");
        if (!res.ok) {
          if (res.status === 401) {
            setError("Session expired. Please sign in again.");
          }
          return;
        }
        const data = await res.json();
        if (mounted && data.portfolio) {
          setPortfolio(data.portfolio);
          setSubdomain(data.portfolio.subdomain);
          setTitle(data.portfolio.title || "");
        } else if (mounted && staff?.email) {
          // Pre-populate sensible handle from email
          const defaultHandle = staff.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 24);
          if (defaultHandle.length >= 3) {
            setSubdomain(defaultHandle);
          }
        }
      } catch (err) {
        console.error("Failed to load portfolio:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPortfolio();
    return () => {
      mounted = false;
    };
  }, [staff]);

  const copyUrl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Process selected file(s) into FormData
  const handleZipSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip") && file.type !== "application/zip") {
      setError("Please select a valid .zip archive.");
      return;
    }

    const fd = new FormData();
    fd.append("zip", file);
    stagedDataRef.current = fd;
    stagedZipFileRef.current = file;
    stagedFolderFilesRef.current = null;
    setStagedFiles({
      count: 1,
      size: file.size,
      name: file.name,
    });
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fd = new FormData();
    let totalSize = 0;
    const fileList: File[] = [];
    const pathList: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      fd.append("files", f);
      const relPath = f.webkitRelativePath || f.name;
      fd.append("paths", relPath);
      fileList.push(f);
      pathList.push(relPath);
      totalSize += f.size;
    }

    stagedDataRef.current = fd;
    stagedZipFileRef.current = null;
    stagedFolderFilesRef.current = { files: fileList, paths: pathList };
    setStagedFiles({
      count: files.length,
      size: totalSize,
      name: `Folder (${files.length} files)`,
    });
  };

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setError(null);
    setSuccess(null);

    const items = e.dataTransfer.items;
    const files = e.dataTransfer.files;

    if (!files || files.length === 0) return;

    // Check if single zip file was dropped
    if (files.length === 1 && files[0].name.endsWith(".zip")) {
      const file = files[0];
      const fd = new FormData();
      fd.append("zip", file);
      stagedDataRef.current = fd;
      stagedZipFileRef.current = file;
      stagedFolderFilesRef.current = null;
      setStagedFiles({
        count: 1,
        size: file.size,
        name: file.name,
      });
      return;
    }

    // Process dropped directory or multiple files
    const fd = new FormData();
    let totalSize = 0;
    let count = 0;
    const droppedFiles: File[] = [];
    const droppedPaths: string[] = [];

    // Helper to traverse directories via FileSystem API
    async function traverseEntry(entry: FileSystemEntry, currentPath: string): Promise<void> {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        await new Promise<void>((resolve) => {
          fileEntry.file((file) => {
            const relPath = currentPath ? `${currentPath}/${file.name}` : file.name;
            fd.append("files", file);
            fd.append("paths", relPath);
            droppedFiles.push(file);
            droppedPaths.push(relPath);
            totalSize += file.size;
            count++;
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        const readEntries = async (): Promise<void> => {
          const entries = await new Promise<FileSystemEntry[]>((resolve) => {
            reader.readEntries((res) => resolve(res));
          });
          if (entries.length > 0) {
            for (const child of entries) {
              await traverseEntry(child, currentPath ? `${currentPath}/${entry.name}` : entry.name);
            }
            await readEntries();
          }
        };
        await readEntries();
      }
    }

    // Try webkitGetAsEntry for folders
    let hasEntries = false;
    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === "function") {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
          hasEntries = true;
          await traverseEntry(entry, "");
        }
      }
    }

    if (!hasEntries || count === 0) {
      // Fallback: standard file list
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const relPath = f.webkitRelativePath || f.name;
        fd.append("files", f);
        fd.append("paths", relPath);
        droppedFiles.push(f);
        droppedPaths.push(relPath);
        totalSize += f.size;
        count++;
      }
    }

    stagedDataRef.current = fd;
    stagedZipFileRef.current = null;
    stagedFolderFilesRef.current = { files: droppedFiles, paths: droppedPaths };
    setStagedFiles({
      count,
      size: totalSize,
      name: `Dropped content (${count} files)`,
    });
  };

  // Perform deploy
  const handleDeploy = async () => {
    if (!stagedDataRef.current && !stagedZipFileRef.current && !stagedFolderFilesRef.current) {
      setError("Please select or drop a portfolio folder or .zip file first.");
      return;
    }

    const cleanSubdomain = subdomain.trim().toLowerCase();
    if (!cleanSubdomain) {
      setError("Please choose a custom subdomain handle.");
      return;
    }

    if (cleanSubdomain.length < 3 || cleanSubdomain.length > 30) {
      setError("Subdomain handle must be between 3 and 30 characters.");
      return;
    }

    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(cleanSubdomain)) {
      setError("Subdomain may only contain lowercase letters, numbers, and hyphens (no hyphens at start or end).");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);
      setUploadProgress(0);
      setUploadStatus("Preparing deployment...");

      let deployPortfolioData: TeamPortfolio | null = null;

      // 1. If a ZIP file was selected or dropped: use chunked upload
      if (stagedZipFileRef.current) {
        setUploadStatus("Uploading portfolio package (0%)...");
        const res = await uploadChunked<TeamPortfolio>({
          file: stagedZipFileRef.current,
          purpose: "portfolio",
          filename: stagedZipFileRef.current.name,
          metadata: {
            subdomain: cleanSubdomain,
            title: title.trim(),
          },
          onProgress: (pct) => {
            setUploadProgress(pct);
            setUploadStatus(`Uploading: ${Math.round(pct * 100)}%...`);
          },
        });

        if (!res.ok || !res.portfolio) {
          throw new Error(res.error || "Portfolio deployment failed.");
        }
        deployPortfolioData = res.portfolio as TeamPortfolio;
      }
      // 2. If a folder was selected or dropped
      else if (stagedFolderFilesRef.current) {
        const { files, paths } = stagedFolderFilesRef.current;
        const totalBytes = stagedFiles?.size || 0;

        // If folder is larger than 3.5 MB, zip client-side with JSZip and chunk-upload
        if (totalBytes > 3.5 * 1024 * 1024) {
          setUploadStatus("Compressing folder into archive...");
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          for (let i = 0; i < files.length; i++) {
            zip.file(paths[i], files[i]);
          }
          setUploadStatus("Finalizing zip archive...");
          const zipBlob = await zip.generateAsync(
            { type: "blob", compression: "DEFLATE" },
            (meta) => {
              setUploadStatus(`Compressing: ${Math.round(meta.percent)}%...`);
            }
          );

          setUploadStatus("Uploading portfolio package (0%)...");
          const res = await uploadChunked<TeamPortfolio>({
            file: zipBlob,
            purpose: "portfolio",
            filename: `${cleanSubdomain}-portfolio.zip`,
            metadata: {
              subdomain: cleanSubdomain,
              title: title.trim(),
            },
            onProgress: (pct) => {
              setUploadProgress(pct);
              setUploadStatus(`Uploading: ${Math.round(pct * 100)}%...`);
            },
          });

          if (!res.ok || !res.portfolio) {
            throw new Error(res.error || "Portfolio deployment failed.");
          }
          deployPortfolioData = res.portfolio as TeamPortfolio;
        } else {
          // Folder <= 3.5 MB: direct deploy
          setUploadStatus("Deploying folder to edge storage...");
          const fd = stagedDataRef.current || new FormData();
          fd.set("subdomain", cleanSubdomain);
          if (title.trim()) {
            fd.set("title", title.trim());
          }

          const res = await fetch("/api/portfolio/deploy", {
            method: "POST",
            body: fd,
          });

          const data = await res.json();
          if (!res.ok || !data.ok) {
            throw new Error(data.error || `Deployment failed with status ${res.status}`);
          }
          deployPortfolioData = data.portfolio;
        }
      } else if (stagedDataRef.current) {
        const fd = stagedDataRef.current;
        fd.set("subdomain", cleanSubdomain);
        if (title.trim()) {
          fd.set("title", title.trim());
        }

        const res = await fetch("/api/portfolio/deploy", {
          method: "POST",
          body: fd,
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || `Deployment failed with status ${res.status}`);
        }
        deployPortfolioData = data.portfolio;
      }

      if (!deployPortfolioData) {
        throw new Error("No deployment data received.");
      }

      setPortfolio(deployPortfolioData);
      setSuccess(`Portfolio successfully deployed to https://${cleanSubdomain}.thevirtuslabs.com!`);
      setStagedFiles(null);
      stagedDataRef.current = null;
      stagedZipFileRef.current = null;
      stagedFolderFilesRef.current = null;
      if (zipInputRef.current) zipInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    } catch (err: unknown) {
      console.error("Deploy error:", err);
      setError(err instanceof Error ? err.message : "Deployment failed.");
    } finally {
      setUploading(false);
      setUploadStatus("");
      setUploadProgress(0);
    }
  };

  // Delete portfolio
  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/portfolio/me", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to unpublish portfolio");
      }
      setPortfolio(null);
      setConfirmDelete(false);
      setSuccess("Your portfolio has been unpublished and all deployed files removed.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unpublish portfolio.");
    } finally {
      setLoading(false);
    }
  };

  const liveUrl = portfolio ? `https://${portfolio.subdomain}.thevirtuslabs.com` : "";
  const localPreviewUrl = portfolio ? `/portfolios/${portfolio.subdomain}` : "";

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Netlify Drop for Team Members</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Globe className="w-7 h-7 text-indigo-400" />
            Static Portfolio Hosting
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Deploy your static portfolio (HTML, CSS, JS, images) in seconds. Automatically routed to your own custom
            subdomain with zero DNS or SSL configuration required.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          <div className="flex-1 font-medium">{success}</div>
        </div>
      )}

      {/* Live Deployment Card if active */}
      {portfolio && !loading && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-2xl p-6 md:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
                  Live Deployment
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Deployed {new Date(portfolio.deployedAt).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {portfolio.title || `${staff?.name || "Team"}'s Portfolio`}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-sm font-semibold transition"
                  >
                    <span>{portfolio.subdomain}.thevirtuslabs.com</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>

                  <button
                    onClick={() => copyUrl(liveUrl)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
                    title="Copy public URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>

                  <a
                    href={localPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    title="Open local preview route"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preview Route</span>
                  </a>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-slate-500" />
                  <span>
                    <strong className="text-slate-200">{portfolio.fileCount}</strong> files
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-slate-500" />
                  <span>
                    <strong className="text-slate-200">{formatBytes(portfolio.totalSizeBytes)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-slate-500" />
                  <span>
                    Entry: <strong className="text-slate-200">{portfolio.entryFile}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-row lg:flex-col items-center lg:items-end gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-800">
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20"
              >
                <span>Visit Live Portfolio</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition"
                  >
                    Confirm Unpublish
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-400 transition py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Unpublish Portfolio</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload & Subdomain Configuration */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {portfolio ? "Deploy an Update" : "Deploy New Portfolio"}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Choose your subdomain handle, configure a title, and drop your build folder or .zip file.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Subdomain Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Subdomain Handle <span className="text-indigo-400">*</span>
            </label>
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition px-3.5 py-2.5">
              <span className="text-slate-500 text-sm font-mono select-none">https://</span>
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="jordan"
                disabled={uploading}
                maxLength={30}
                className="bg-transparent text-white font-mono text-sm focus:outline-none flex-1 px-1 placeholder:text-slate-600"
              />
              <span className="text-slate-500 text-sm font-mono select-none">.thevirtuslabs.com</span>
            </div>
            <p className="text-xs text-slate-500">
              3 to 30 characters: lowercase letters, numbers, hyphens.
            </p>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Portfolio Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${staff?.name || "Jordan"}'s Portfolio`}
              disabled={uploading}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white text-sm px-3.5 py-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition placeholder:text-slate-600"
            />
            <p className="text-xs text-slate-500">Displayed in internal team records and manager.</p>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all ${
            dragOver
              ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
              : stagedFiles
              ? "border-emerald-500/50 bg-emerald-950/10"
              : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
          }`}
        >
          {/* Hidden inputs */}
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleZipSelected}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard in browsers but not typed in react standard HTMLInput
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderSelected}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
              {stagedFiles ? (
                <FileCode className="w-8 h-8 text-emerald-400 animate-pulse" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>

            {stagedFiles ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Ready to Deploy</span>
                </div>
                <h3 className="text-lg font-bold text-white">{stagedFiles.name}</h3>
                <p className="text-sm text-slate-400">
                  {stagedFiles.count} file{stagedFiles.count > 1 ? "s" : ""} · {formatBytes(stagedFiles.size)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStagedFiles(null);
                    stagedDataRef.current = null;
                    stagedZipFileRef.current = null;
                    stagedFolderFilesRef.current = null;
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                  Choose a different file or folder
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-white">
                  Drag & drop your static portfolio folder or .zip here
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Export your static site (must include an <code className="text-indigo-300">index.html</code> at its root
                  or top level). Sub-pages, CSS, JS, fonts, and images are bundled automatically.
                </p>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Up to 100 MB supported (chunked uploads)</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <FileArchive className="w-4 h-4 text-indigo-400" />
                    <span>Select .ZIP Archive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <Folder className="w-4 h-4 text-emerald-400" />
                    <span>Select Folder</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Deploy submit bar */}
        {stagedFiles && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              Target Subdomain:{" "}
              <strong className="text-indigo-300 font-mono">
                https://{subdomain.trim().toLowerCase() || "your-handle"}.thevirtuslabs.com
              </strong>
            </div>

            {uploading ? (
              <div className="w-full sm:w-auto flex flex-col gap-1.5 min-w-[240px]">
                <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    {uploadStatus || "Deploying..."}
                  </span>
                  {uploadProgress > 0 && (
                    <span className="font-mono text-indigo-300 font-bold">
                      {Math.round(uploadProgress * 100)}%
                    </span>
                  )}
                </div>
                {uploadProgress > 0 && (
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-200 rounded-full"
                      style={{ width: `${Math.round(uploadProgress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDeploy}
                disabled={uploading || !subdomain.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Deploy Portfolio Now</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Guide & Architecture Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-indigo-400" />
            Zero-Config Subdomain
          </div>
          <p>
            Wildcard DNS (*.thevirtuslabs.com) and Next.js middleware automatically route visitors to your static files
            with SSL handled.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-emerald-400" />
            Fast Object Storage
          </div>
          <p>
            Your assets are streamed directly from cloud storage with automatic MIME type headers and optimized caching.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-amber-400" />
            Clean URLs & 404 Fallback
          </div>
          <p>
            Supports clean URLs (e.g. <code>/about</code> resolves to <code>about.html</code>) and custom{" "}
            <code>404.html</code> pages.
          </p>
        </div>
      </div>
    </div>
  );
}
