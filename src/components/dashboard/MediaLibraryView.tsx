"use client";

import React, { useState } from "react";
import { db, MediaAsset } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, btnDark } from "./ui";

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
  const [assets] = useState<MediaAsset[]>(db.getMediaAssets());
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

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
      </div>

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
          </div>
        ))}
      </div>

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
                  download={previewAsset.filename}
                  className="px-4 py-2 bg-[#FBD227] border border-[#FBD227] text-xs font-bold text-black rounded hover:bg-white transition-colors"
                >
                  Download file
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
