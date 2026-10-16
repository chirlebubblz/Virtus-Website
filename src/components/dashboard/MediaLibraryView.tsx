"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";
import { errorText, workspaceApi } from "./api";
import { useClients } from "./useClients";

const CATEGORIES: MediaAsset["category"][] = ["Templates", "Brand Kit", "Deliverables", "Stock / Raw", "Legal"];

const isSafeUrl = (url: string) => /^https:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"));
const absoluteUrl = (url: string) => (url.startsWith("/") ? `${window.location.origin}${url}` : url);

const isHtmlAsset = (asset: MediaAsset) =>
  asset.filename.toLowerCase().endsWith(".html") ||
  asset.filename.toLowerCase().endsWith(".htm") ||
  asset.url.toLowerCase().endsWith(".html") ||
  asset.url.includes("oak-harbor");

const isPdfAsset = (asset: MediaAsset) =>
  asset.filename.toLowerCase().endsWith(".pdf") ||
  asset.url.toLowerCase().endsWith(".pdf");

const isVideoAsset = (asset: MediaAsset) =>
  asset.fileType === "video" || /\.(mp4|webm|mov|mkv)$/i.test(asset.filename);

const isAudioAsset = (asset: MediaAsset) =>
  asset.fileType === "audio" || /\.(mp3|wav|ogg|m4a|aac)$/i.test(asset.filename);

const getSubpageSlug = (asset: MediaAsset) => {
  if (asset.url.startsWith("/library/")) {
    return asset.url.replace(/^\/library\//, "").replace(/\.html$/i, "");
  }
  const cleanFilename = asset.filename.replace(/\.html$/i, "").replace(/\.htm$/i, "");
  return cleanFilename.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
};

const getSubpageUrl = (asset: MediaAsset) => {
  if (asset.url.startsWith("/library/")) {
    return asset.url;
  }
  return `/library/${getSubpageSlug(asset)}`;
};

const getDownloadUrl = (asset: MediaAsset) => {
  if (asset.url.startsWith("/api/media/file")) {
    return `${asset.url}&download=1`;
  }
  if (isHtmlAsset(asset)) {
    return `${getSubpageUrl(asset)}?download=1`;
  }
  return asset.url;
};

interface MediaLibraryViewProps {
  /** Team members see the shared studio library only, never client work. */
  role?: "admin" | "team";
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({ role = "admin" }) => {
  const [activeTab, setActiveTab] = useState<"general" | "client">("general");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAssets = useCallback(() => {
    setLoad("loading");
    workspaceApi<MediaAsset[]>("/api/media")
      .then((data) => {
        setAssets(data);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, []);
  useEffect(loadAssets, [loadAssets]);

  const toggleShared = async (asset: MediaAsset) => {
    setBusyId(asset.id);
    setActionError(null);
    try {
      const updated = await workspaceApi<MediaAsset>("/api/media", "PATCH", { id: asset.id, visibleToClient: !asset.visibleToClient });
      setAssets((cur) => cur.map((a) => (a.id === updated.id ? updated : a)));
      setPreviewAsset((cur) => (cur?.id === updated.id ? updated : cur));
    } catch (err) {
      setActionError(errorText(err, "Could not change sharing. Try again."));
    } finally {
      setBusyId(null);
    }
  };

  const deleteAsset = async (asset: MediaAsset) => {
    if (!window.confirm(`Delete "${asset.title}"? The file is removed for good.`)) return;
    setBusyId(asset.id);
    setActionError(null);
    try {
      await workspaceApi("/api/media", "DELETE", { id: asset.id });
      setAssets((cur) => cur.filter((a) => a.id !== asset.id));
      setPreviewAsset((cur) => (cur?.id === asset.id ? null : cur));
    } catch (err) {
      setActionError(errorText(err, "Could not delete the file. Try again."));
    } finally {
      setBusyId(null);
    }
  };

  // Upload: get a signed link, send the file straight to storage, then register it.
  const { clients } = useClients();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MediaAsset["category"]>("Templates");
  const [clientId, setClientId] = useState("");
  const [share, setShare] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const openUpload = () => {
    const forClient = activeTab === "client";
    setFile(null);
    setTitle("");
    setCategory(forClient ? "Deliverables" : "Templates");
    setClientId(forClient ? clients[0]?.id ?? "" : "");
    setShare(false);
    setUploadError(null);
    setUploadOpen(true);
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setUploadError("Choose a file.");
    setUploading(true);
    setUploadError(null);
    setProgress(0);

    const isHtml = file.name.toLowerCase().endsWith(".html") || file.name.toLowerCase().endsWith(".htm") || file.type === "text/html";

    // Direct upload for HTML files: stores directly into Neon and assigns subpage slug
    if (isHtml) {
      try {
        setProgress(0.5);
        const content = await file.text();
        setProgress(0.9);
        const asset = await workspaceApi<MediaAsset>("/api/media", "POST", {
          title: title.trim() || file.name,
          filename: file.name,
          mime: "text/html",
          category,
          clientId: clientId || null,
          visibleToClient: Boolean(clientId) && share,
          content,
          size: file.size,
        });
        setProgress(1);
        setAssets((cur) => [asset, ...cur]);
        setActiveTab(asset.clientId ? "client" : "general");
        setUploadOpen(false);
        return;
      } catch (err) {
        setUploadError(errorText(err, "HTML upload failed. Try again."));
        return;
      } finally {
        setUploading(false);
      }
    }

    let started: { key: string; uploadId: string } | null = null;
    try {
      const { key, uploadId, partSize, parts } = await workspaceApi<{ key: string; uploadId: string; partSize: number; parts: number }>(
        "/api/media/upload",
        "POST",
        { action: "start", filename: file.name, size: file.size, mime: file.type }
      );
      started = { key, uploadId };
      // One part at a time, each with a fresh signed link and up to 3 tries, so a dropped connection costs one part.
      for (let n = 1; n <= parts; n++) {
        const chunk = file.slice((n - 1) * partSize, n * partSize);
        for (let attempt = 1; ; attempt++) {
          const { url } = await workspaceApi<{ url: string }>("/api/media/upload", "POST", { action: "part", key, uploadId, partNumber: n });
          const put = await fetch(url, { method: "PUT", body: chunk }).catch(() => null);
          if (put?.ok) break;
          if (attempt === 3) throw new Error("The upload failed. Check your connection and try again.");
        }
        setProgress(n / parts);
      }
      await workspaceApi("/api/media/upload", "POST", { action: "complete", key, uploadId });
      started = null;
      const asset = await workspaceApi<MediaAsset>("/api/media", "POST", {
        key,
        title: title.trim() || file.name,
        filename: file.name,
        mime: file.type,
        category,
        clientId: clientId || null,
        visibleToClient: Boolean(clientId) && share,
      });
      setAssets((cur) => [asset, ...cur]);
      setActiveTab(asset.clientId ? "client" : "general");
      setUploadOpen(false);
    } catch (err) {
      // Discard the unfinished parts. Best effort: the error shown is the upload's, not this cleanup's.
      if (started) workspaceApi("/api/media/upload", "POST", { action: "abort", ...started }).catch(() => undefined);
      setUploadError(errorText(err, "The upload failed. Try again."));
    } finally {
      setUploading(false);
    }
  };

  const copyLink = async (asset: MediaAsset) => {
    const targetUrl = isHtmlAsset(asset)
      ? `${window.location.origin}${getSubpageUrl(asset)}`
      : absoluteUrl(asset.url);
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId((cur) => (cur === asset.id ? null : cur)), 2000);
    } catch {
      window.prompt("Copy this link:", targetUrl);
    }
  };

  const copySubpageLink = async (asset: MediaAsset) => {
    const subpageUrl = `${window.location.origin}${getSubpageUrl(asset)}`;
    try {
      await navigator.clipboard.writeText(subpageUrl);
      setCopiedId(`subpage-${asset.id}`);
      setTimeout(() => setCopiedId((cur) => (cur === `subpage-${asset.id}` ? null : cur)), 2000);
    } catch {
      window.prompt("Copy this subpage link:", subpageUrl);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const showClientVault = role === "admin" && activeTab === "client";
    const matchesTab = showClientVault ? asset.clientId !== null : asset.clientId === null;
    const matchesType = selectedType === "all" ? true : asset.fileType === selectedType;
    return matchesTab && matchesType;
  });

  return (
    <div className="p-6 sm:p-10 max-w-[88rem] mx-auto text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-gray-400 block mb-1">
            Media vault
          </span>
          <h1 className="font-monument text-3xl font-black text-white tracking-tight">
            MEDIA & DOCUMENT LIBRARY
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Agency templates, brand kits, client deliverables and production files.
          </p>
        </div>
        {role === "admin" && (
          <button type="button" onClick={openUpload} className={btnPrimary}>
            <Icon name="upload" className="h-4 w-4" />
            Upload file
          </button>
        )}
      </div>

      {load === "error" && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          <span>The Library could not be loaded. Check your connection and try again.</span>
          <button type="button" onClick={loadAssets} className={btnDark}>
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="mb-6 border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
          {actionError}
        </p>
      )}

      {/* Tabs & Type Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4 mb-6">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all border ${
              activeTab === "general"
                ? "bg-[#FBD227] text-black border-[#FBD227] shadow-sm"
                : "bg-[#141414] text-gray-400 border-[#262626] hover:text-white"
            }`}
          >
            General Library
          </button>
          {role === "admin" && (
          <button
            type="button"
            aria-pressed={activeTab === "client"}
            onClick={() => setActiveTab("client")}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all border ${
              activeTab === "client"
                ? "bg-[#FBD227] text-black border-[#FBD227] shadow-sm"
                : "bg-[#141414] text-gray-400 border-[#262626] hover:text-white"
            }`}
          >
            Client Work Vault
          </button>
          )}
        </div>

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "document", "image", "video", "audio"].map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={selectedType === type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 text-xs font-mono uppercase rounded transition-colors border ${
                selectedType === type
                  ? "bg-[#FBD227] text-black border-[#FBD227] font-bold"
                  : "bg-[#141414] text-gray-400 border-[#262626] hover:text-white font-medium"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {load === "loading" && <p className="text-xs font-mono text-gray-400">Loading files…</p>}
      {load === "ready" && filteredAssets.length === 0 && (
        <p className="border border-[#262626] bg-[#111111] p-6 text-center text-xs font-mono text-gray-400">
          No files here yet.{role === "admin" ? " Use Upload file to add one." : ""}
        </p>
      )}

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            className="group border border-[#262626] bg-[#111111] rounded-lg p-4 shadow-sm hover:border-[#383838] transition-all flex flex-col justify-between"
          >
            <div>
              {/* Type Badge & Category */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#181818] border border-[#262626] text-gray-300">
                  {asset.fileType}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  {asset.category}
                </span>
              </div>

              {/* Title & Client Name */}
              <h3 className="font-bold text-sm text-white leading-snug group-hover:text-[#FBD227] transition-colors line-clamp-2">
                {asset.title}
              </h3>
              {asset.clientName && (
                <span className="inline-block text-xs font-medium text-[#FBD227] bg-[#FBD227]/10 border border-[#FBD227]/20 px-2 py-0.5 rounded mt-1.5">
                  Client: {asset.clientName}
                </span>
              )}

              {/* File Info */}
              <div className="mt-3 pt-3 border-t border-[#262626] text-xs text-gray-400 font-mono">
                <p className="truncate text-gray-300 font-medium">{asset.filename}</p>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{asset.fileSize}</span>
                  <span>{asset.createdAt}</span>
                </div>
              </div>

              {/* Subpage Pill for HTML / Web deliverables */}
              {isHtmlAsset(asset) && (
                <div className="mt-2.5 px-2 py-1.5 bg-[#FBD227]/10 border border-[#FBD227]/30 rounded text-[11px] font-mono flex items-center justify-between text-[#FBD227]">
                  <span className="truncate pr-1">/library/{getSubpageSlug(asset)}</span>
                  <button
                    type="button"
                    onClick={() => copySubpageLink(asset)}
                    className="font-bold underline uppercase tracking-wider shrink-0 hover:text-white"
                  >
                    {copiedId === `subpage-${asset.id}` ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPreviewAsset(asset)}
                className="text-xs font-bold text-[#FBD227] hover:underline"
              >
                Preview →
              </button>
              {isSafeUrl(asset.url) ? (
                <div className="flex items-center gap-2.5">
                  <a
                    href={getDownloadUrl(asset)}
                    download={asset.filename}
                    className="text-xs font-mono font-medium text-gray-300 hover:text-[#FBD227] transition-colors"
                    title={`Download ${asset.filename}`}
                  >
                    Download ⤓
                  </a>
                  <a
                    href={isHtmlAsset(asset) ? getSubpageUrl(asset) : asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono font-bold text-[#FBD227] hover:underline flex items-center gap-1"
                  >
                    {isHtmlAsset(asset) ? "Open ↗" : "View ↗"}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyLink(asset)}
                    className="text-xs font-mono text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedId === asset.id ? "Copied ✓" : "Copy Link"}
                  </button>
                </div>
              ) : (
                <span className="text-xs font-mono text-gray-500">No link yet</span>
              )}
            </div>
            {role === "admin" && (
              <div className="mt-3 pt-3 border-t border-[#262626] flex items-center justify-between gap-2">
                {asset.clientId ? (
                  <label className="flex items-center gap-2 text-xs font-mono text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean(asset.visibleToClient)}
                      disabled={busyId === asset.id}
                      onChange={() => toggleShared(asset)}
                      className="accent-[#FBD227]"
                    />
                    Shared with client
                  </label>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={busyId === asset.id}
                  onClick={() => deleteAsset(asset)}
                  aria-label={`Delete ${asset.title}`}
                  className="text-xs font-mono text-gray-400 hover:text-[#DD7230] disabled:opacity-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={uploadOpen} onClose={() => !uploading && setUploadOpen(false)} title="Upload file">
        <form onSubmit={submitUpload} className="space-y-4">
          <div>
            <label htmlFor="media-file" className={labelClass}>File</label>
            <input
              id="media-file"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={`${fieldClass} file:mr-3 file:border-0 file:bg-[#FBD227] file:px-3 file:py-1 file:text-xs file:font-bold file:text-black`}
            />
          </div>
          <div>
            <label htmlFor="media-title" className={labelClass}>Title</label>
            <input
              id="media-title"
              value={title}
              maxLength={200}
              placeholder={file?.name ?? "Defaults to the file name"}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="media-category" className={labelClass}>Category</label>
              <select
                id="media-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MediaAsset["category"])}
                className={fieldClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="media-client" className={labelClass}>Library</label>
              <select id="media-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={fieldClass}>
                <option value="">General (visible to team)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>Client: {c.name}</option>
                ))}
              </select>
            </div>
          </div>
          {clientId && (
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="accent-[#FBD227]" />
              Share with the client now (shows in their portal Files)
            </label>
          )}
          {uploading && (
            <div>
              <progress value={progress} max={1} aria-label="Upload progress" className="h-2 w-full accent-[#FBD227]" />
              <p className="mt-1 text-xs font-mono text-gray-400">
                {Math.round(progress * 100)}% uploaded. Keep this window open until it finishes.
              </p>
            </div>
          )}
          {uploadError && (
            <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
              {uploadError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
            <button type="button" disabled={uploading} onClick={() => setUploadOpen(false)} className={btnGhost}>
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className={btnPrimary}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={previewAsset !== null}
        onClose={() => setPreviewAsset(null)}
        title={previewAsset?.title ?? "Asset preview"}
        maxWidth={previewAsset && (isHtmlAsset(previewAsset) || isPdfAsset(previewAsset) || isVideoAsset(previewAsset)) ? "max-w-5xl" : "max-w-xl"}
      >
        {previewAsset && (
          <>
            <div className="bg-[#141414] border border-[#262626] p-4 text-center rounded">
              {isPdfAsset(previewAsset) && isSafeUrl(previewAsset.url) ? (
                <div className="w-full h-[70vh] border border-[#262626] rounded overflow-hidden bg-[#161616] flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] border-b border-[#262626] text-xs font-mono">
                    <span className="flex items-center gap-2 text-[#FBD227] font-bold">
                      <Icon name="file" className="h-4 w-4" /> PDF Document Preview
                    </span>
                    <a
                      href={getDownloadUrl(previewAsset)}
                      download={previewAsset.filename}
                      className="px-2.5 py-1 bg-[#FBD227] text-black font-bold text-xs rounded hover:bg-white transition-colors flex items-center gap-1"
                    >
                      Download PDF ⤓
                    </a>
                  </div>
                  <iframe
                    src={previewAsset.url}
                    title={previewAsset.title}
                    className="w-full flex-1 border-0 bg-white"
                  />
                </div>
              ) : isVideoAsset(previewAsset) && isSafeUrl(previewAsset.url) ? (
                <div className="w-full bg-black border border-[#262626] rounded p-2 flex flex-col items-center">
                  <video
                    src={previewAsset.url}
                    controls
                    playsInline
                    className="max-h-[65vh] max-w-full rounded"
                  />
                </div>
              ) : isAudioAsset(previewAsset) && isSafeUrl(previewAsset.url) ? (
                <div className="w-full bg-[#161616] border border-[#262626] rounded p-8 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-[#FBD227]/10 border border-[#FBD227]/30 flex items-center justify-center mb-4">
                    <Icon name="music" className="h-8 w-8 text-[#FBD227]" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">{previewAsset.title}</h4>
                  <p className="text-xs font-mono text-gray-400 mb-6">{previewAsset.filename} • {previewAsset.fileSize}</p>
                  <audio src={previewAsset.url} controls className="w-full max-w-lg mx-auto" />
                </div>
              ) : isHtmlAsset(previewAsset) && isSafeUrl(previewAsset.url) ? (
                <div className="w-full h-[70vh] border border-[#262626] rounded overflow-hidden bg-[#0B111C] flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#141414] border-b border-[#262626] text-xs font-mono">
                    <span className="flex items-center gap-2 text-[#FBD227] font-bold">
                      <Icon name="link" className="h-4 w-4" /> Interactive Web Subpage
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => copySubpageLink(previewAsset)}
                        className="text-gray-300 hover:text-white flex items-center gap-1"
                      >
                        {copiedId === `subpage-${previewAsset.id}` ? "Link Copied ✓" : "Copy Subpage Link 🔗"}
                      </button>
                      <a
                        href={getSubpageUrl(previewAsset)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#FBD227] hover:underline font-bold"
                      >
                        Open Full Subpage ↗
                      </a>
                    </div>
                  </div>
                  <iframe
                    src={getSubpageUrl(previewAsset)}
                    title={previewAsset.title}
                    className="w-full flex-1 border-0"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  />
                </div>
              ) : previewAsset.fileType === "image" && isSafeUrl(previewAsset.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAsset.url}
                  alt={previewAsset.title}
                  className="max-h-[70vh] mx-auto object-contain rounded"
                />
              ) : (
                <div className="space-y-4 p-8 bg-[#161616] border border-[#262626] rounded text-center">
                  <div className="flex h-20 w-20 mx-auto items-center justify-center border border-[#333333] bg-[#111111] rounded">
                    <Icon name="file" className="h-10 w-10 text-[#FBD227]" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">{previewAsset.title}</h4>
                    <p className="text-xs font-mono text-gray-400">{previewAsset.filename} • {previewAsset.fileSize}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className={btnDark}
              >
                Close
              </button>
              {isSafeUrl(previewAsset.url) ? (
                <>
                  <a
                    href={getDownloadUrl(previewAsset)}
                    download={previewAsset.filename}
                    className="px-4 py-2 border border-[#333333] bg-[#1a1a1a] text-xs font-bold text-white rounded hover:border-[#FBD227] hover:text-[#FBD227] transition-colors flex items-center gap-1.5"
                  >
                    Download File ⤓
                  </a>
                  <a
                    href={isHtmlAsset(previewAsset) ? getSubpageUrl(previewAsset) : previewAsset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#FBD227] border border-[#FBD227] text-xs font-bold text-black rounded hover:bg-white transition-colors"
                  >
                    {isHtmlAsset(previewAsset) ? "Open Subpage ↗" : "Open in new tab ↗"}
                  </a>
                </>
              ) : (
                <span className="px-4 py-2 border border-[#262626] text-xs font-bold text-gray-500 rounded">File not uploaded yet</span>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
