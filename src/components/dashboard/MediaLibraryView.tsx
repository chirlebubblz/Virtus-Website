"use client";

import React, { useState } from "react";
import { db, MediaAsset } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal } from "./ui";

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
    <div className="p-6 sm:p-10 max-w-[88rem] mx-auto text-[#000000]">
      {/* Header & Storage Gauge */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-gray-500 block mb-1">
            Media vault
          </span>
          <h1 className="font-monument text-3xl font-black text-[#000000] tracking-tight">
            MEDIA & DOCUMENT LIBRARY
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Agency templates, brand kits, client deliverables and production files.
          </p>
        </div>

      </div>

      {/* Tabs & Type Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-300 pb-4 mb-6">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all ${
              activeTab === "general"
                ? "bg-[#000000] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            General Library
          </button>
          {role === "admin" && (
          <button
            type="button"
            aria-pressed={activeTab === "client"}
            onClick={() => setActiveTab("client")}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all ${
              activeTab === "client"
                ? "bg-[#000000] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
              className={`px-3 py-1 text-xs font-mono uppercase rounded transition-colors ${
                selectedType === type
                  ? "bg-[#FBD227] text-black font-bold"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
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
            className="group border border-gray-300 bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              {/* Type Badge & Category */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {asset.fileType}
                </span>
                <span className="text-xs font-mono text-gray-600">
                  {asset.category}
                </span>
              </div>

              {/* Title & Client Name */}
              <h3 className="font-bold text-sm text-black leading-snug group-hover:text-amber-600 transition-colors line-clamp-2">
                {asset.title}
              </h3>
              {asset.clientName && (
                <span className="inline-block text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded mt-1.5">
                  Client: {asset.clientName}
                </span>
              )}

              {/* File Info */}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 font-mono">
                <p className="truncate text-gray-700 font-medium">{asset.filename}</p>
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span>{asset.fileSize}</span>
                  <span>{asset.createdAt}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewAsset(asset)}
                className="text-xs font-bold text-black hover:underline"
              >
                Preview →
              </button>
              {isSafeUrl(asset.url) ? (
                <button
                  type="button"
                  onClick={() => copyLink(asset)}
                  className="text-xs font-mono text-gray-600 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  {copiedId === asset.id ? "Copied" : "Copy Link"}
                </button>
              ) : (
                <span className="text-xs font-mono text-gray-600">No link yet</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={previewAsset !== null} onClose={() => setPreviewAsset(null)} title={previewAsset?.title ?? "Asset preview"}>
        {previewAsset && (
          <>
            <div className="bg-gray-50 border border-gray-200 p-6 text-center">
              {previewAsset.fileType === "image" && isSafeUrl(previewAsset.url) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewAsset.url}
                  alt={previewAsset.title}
                  className="max-h-80 mx-auto object-contain"
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex h-24 items-center justify-center border border-gray-300 bg-gray-100">
                    <Icon
                      name={previewAsset.fileType === "video" ? "video" : previewAsset.fileType === "audio" ? "music" : "file"}
                      className="h-10 w-10 text-gray-600"
                    />
                  </div>
                  <p className="text-xs font-bold text-gray-700">{previewAsset.filename}</p>
                  <p className="text-xs text-gray-600">No inline preview for this file type.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="px-4 py-2 border border-gray-300 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
              >
                Close
              </button>
              {isSafeUrl(previewAsset.url) ? (
                <a
                  href={previewAsset.url}
                  download={previewAsset.filename}
                  className="px-4 py-2 bg-[#FBD227] border border-black text-xs font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  Download file
                </a>
              ) : (
                <span className="px-4 py-2 border border-gray-300 text-xs font-bold text-gray-600">File not uploaded yet</span>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
