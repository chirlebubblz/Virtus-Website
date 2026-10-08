"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, btnDark, btnGhost, btnPrimary, fieldClass, labelClass } from "./ui";
import { errorText, workspaceApi } from "./api";
import { useClients } from "./useClients";

const CATEGORIES: MediaAsset["category"][] = ["Templates", "Brand Kit", "Deliverables", "Stock / Raw", "Legal"];

// Only https links and same-origin paths are safe to open or copy from asset data.
const isSafeUrl = (url: string) => /^https:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"));
const absoluteUrl = (url: string) => (url.startsWith("/") ? `${window.location.origin}${url}` : url);

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
    try {
      const { key, uploadUrl, headers } = await workspaceApi<{ key: string; uploadUrl: string; headers: Record<string, string> }>(
        "/api/media/upload",
        "POST",
        { filename: file.name, size: file.size }
      );
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers });
      if (!put.ok) throw new Error("The upload failed. Check your connection and try again.");
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
      setUploadError(errorText(err, "The upload failed. Try again."));
    } finally {
      setUploading(false);
    }
  };

  const copyLink = async (asset: MediaAsset) => {
    try {
      await navigator.clipboard.writeText(absoluteUrl(asset.url));
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId((cur) => (cur === asset.id ? null : cur)), 2000);
    } catch {
      window.prompt("Copy this link:", absoluteUrl(asset.url));
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
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewAsset(asset)}
                className="text-xs font-bold text-[#FBD227] hover:underline"
              >
                Preview →
              </button>
              {isSafeUrl(asset.url) ? (
                <button
                  type="button"
                  onClick={() => copyLink(asset)}
                  className="text-xs font-mono text-gray-400 hover:text-white transition-colors"
                >
                  {copiedId === asset.id ? "Copied ✓" : "Copy Link"}
                </button>
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

      <Modal open={previewAsset !== null} onClose={() => setPreviewAsset(null)} title={previewAsset?.title ?? "Asset preview"}>
        {previewAsset && (
          <>
            <div className="bg-[#161616] border border-[#262626] p-6 text-center rounded">
              {previewAsset.fileType === "image" && isSafeUrl(previewAsset.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAsset.url}
                  alt={previewAsset.title}
                  className="max-h-80 mx-auto object-contain rounded"
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex h-24 items-center justify-center border border-[#262626] bg-[#111111] rounded">
                    <Icon
                      name={previewAsset.fileType === "video" ? "video" : previewAsset.fileType === "audio" ? "music" : "file"}
                      className="h-10 w-10 text-[#FBD227]"
                    />
                  </div>
                  <p className="text-xs font-bold text-white">{previewAsset.filename}</p>
                  <p className="text-xs text-gray-400">No inline preview for this file type.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className={btnDark}
              >
                Close
              </button>
              {isSafeUrl(previewAsset.url) ? (
                <a
                  href={previewAsset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#FBD227] border border-[#FBD227] text-xs font-bold text-black rounded hover:bg-white transition-colors"
                >
                  Open file
                </a>
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
