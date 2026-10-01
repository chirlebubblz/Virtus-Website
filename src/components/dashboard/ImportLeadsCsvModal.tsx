"use client";

import React, { useState, useRef } from "react";
import type { Opportunity } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { Modal, btnPrimary, btnDark } from "./ui";

interface ImportLeadsCsvModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (imported: Opportunity[]) => void;
}

interface ParsedLeadRow {
  name: string;
  company: string;
  email: string;
  phone?: string;
  dealValue: number;
  stage: Opportunity["stage"];
  recommendedTier: Opportunity["recommendedTier"];
  leadScore: Opportunity["leadScore"];
  roleLeader: string;
  needs: string[];
  timeline: string;
  location?: string;
  websiteUrl?: string;
  industry?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

/** Robust RFC 4180 compliant CSV line tokenizer supporting quotes and commas inside cells */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const ImportLeadsCsvModal: React.FC<ImportLeadsCsvModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedLeadRow[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const resetState = () => {
    setFileName(null);
    setParsedRows([]);
    setParsingError(null);
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadSample = () => {
    const sampleCsvContent = `Name,Company,Email,Phone,Deal Value,Stage,Recommended Tier,Lead Score,Role Leader,Needs,Timeline,Location,Website,Industry,Notes
"Marcus Brody","Apex Logistics Corp","marcus@apexlogistics.io","+1 (555) 234-5678",12500,"new_inquiry","Integrated","Hot","Ren (Lead Dev)","AI Freight Engine, Web App, Portal","6 Weeks","Chicago, IL","https://apexlogistics.io","Supply Chain & Logistics","Needs high-concurrency carrier dispatch portal"
"Dr. Sarah Jenkins","Aura Health Clinics","sarah@aurahealth.co","+1 (555) 876-5432",8500,"qualified","Growth","Hot","Kai (Brand Lead)","Brand Identity, Patient Booking, Next.js","4 Weeks","Austin, TX","https://aurahealth.co","Healthcare & Wellness","Looking to migrate booking flow from legacy WordPress"
"David Vance","Summit Financial Partners","david@summitfin.com","+1 (555) 345-6789",15000,"proposal_sent","Integrated","Warm","Paks (Director)","Fintech Flagship, SOC2 Audit, Investor Deck","8 Weeks","New York, NY","https://summitfin.com","Financial Services & Wealth","Proposal sent for full Q4 digital modernization"
"Chloe Moreau","Atelier Moreau Paris","chloe@ateliermoreau.fr","+33 1 42 68 55 00",6200,"new_inquiry","Focused","Warm","Sora (UX)","Shopify Custom Theme, 3D Product Viewer","3 Weeks","Paris, France","https://ateliermoreau.fr","Luxury Fashion & Goods","Direct inquiry from Instagram showcase"
"Liam O'Connor","Hyperion Clean Energy","liam@hyperionenergy.org","+1 (555) 901-2345",9800,"in_review","Growth","Warm","Ren (Lead Dev)","ESG Data Visualizer, Next.js Web, CMS","5 Weeks","Denver, CO","https://hyperionenergy.org","CleanTech & Renewable Energy","Board reviewing statement of work this Friday"`;

    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processCsvText = (csvText: string, name: string) => {
    setParsingError(null);
    const lines = csvText
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setParsingError("The selected CSV file appears to be empty or missing headers.");
      return;
    }

    const rawHeaders = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const rows: ParsedLeadRow[] = [];

    // Header index mapping with resilient aliases
    const findHeaderIdx = (...aliases: string[]) => {
      for (const alias of aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        const idx = rawHeaders.indexOf(cleanAlias);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const nameIdx = findHeaderIdx("name", "contactname", "contact", "fullname", "person");
    const companyIdx = findHeaderIdx("company", "companyname", "business", "businessname", "organization", "account");
    const emailIdx = findHeaderIdx("email", "emailaddress", "mail", "contactemail");
    const phoneIdx = findHeaderIdx("phone", "phonenumber", "telephone", "mobile", "tel");
    const dealValueIdx = findHeaderIdx("dealvalue", "value", "deal_value", "amount", "budget", "price", "contractvalue");
    const stageIdx = findHeaderIdx("stage", "pipelinestage", "status", "leadstage");
    const tierIdx = findHeaderIdx("recommendedtier", "tier", "package", "plan");
    const scoreIdx = findHeaderIdx("leadscore", "score", "priority", "temperature");
    const leaderIdx = findHeaderIdx("roleleader", "leader", "assignee", "owner", "rep");
    const needsIdx = findHeaderIdx("needs", "services", "deliverables", "tags", "scope");
    const timelineIdx = findHeaderIdx("timeline", "turnaround", "duedate", "targetdate");
    const locationIdx = findHeaderIdx("location", "city", "address", "state", "country");
    const websiteIdx = findHeaderIdx("website", "websiteurl", "url", "domain");
    const industryIdx = findHeaderIdx("industry", "sector", "category", "vertical");
    const notesIdx = findHeaderIdx("notes", "message", "description", "details", "comments", "internalnotes");

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const values = parseCsvLine(line);

      const getVal = (idx: number) => (idx !== -1 && values[idx] !== undefined ? values[idx].trim() : "");

      const rowName = getVal(nameIdx);
      const rowCompany = getVal(companyIdx);
      const rowEmail = getVal(emailIdx);

      // Validation
      const hasCompany = Boolean(rowCompany);
      const hasName = Boolean(rowName);
      const hasEmail = Boolean(rowEmail && rowEmail.includes("@"));

      const companyFinal = rowCompany || rowName || `Lead ${i}`;
      const nameFinal = rowName || companyFinal;
      const emailFinal = rowEmail || `${companyFinal.toLowerCase().replace(/[^a-z0-9]/g, "") || "lead"}@example.com`;

      // Value parsing
      const rawVal = getVal(dealValueIdx).replace(/[^0-9.]/g, "");
      const dealValue = rawVal ? parseFloat(rawVal) : 0;

      // Stage normalizing
      const rawStage = getVal(stageIdx).toLowerCase().replace(/[^a-z_]/g, "");
      let stage: Opportunity["stage"] = "new_inquiry";
      if (rawStage.includes("qual")) stage = "qualified";
      else if (rawStage.includes("prop")) stage = "proposal_sent";
      else if (rawStage.includes("review")) stage = "in_review";
      else if (rawStage.includes("won")) stage = "won";
      else if (rawStage.includes("lost")) stage = "lost";

      // Tier normalizing
      const rawTier = getVal(tierIdx).toLowerCase();
      let recommendedTier: Opportunity["recommendedTier"] = "Growth";
      if (rawTier.includes("focused")) recommendedTier = "Focused";
      else if (rawTier.includes("integrated")) recommendedTier = "Integrated";

      // Lead score normalizing
      const rawScore = getVal(scoreIdx).toLowerCase();
      let leadScore: Opportunity["leadScore"] = "Warm";
      if (rawScore.includes("hot")) leadScore = "Hot";
      else if (rawScore.includes("cold")) leadScore = "Cold";

      // Needs array
      const rawNeeds = getVal(needsIdx);
      const needs = rawNeeds
        ? rawNeeds.split(/[,;]/).map((n) => n.trim()).filter(Boolean)
        : ["Web", "Brand"];

      const isValid = hasCompany || hasName || hasEmail;

      rows.push({
        name: nameFinal,
        company: companyFinal,
        email: emailFinal,
        phone: getVal(phoneIdx) || undefined,
        dealValue: isNaN(dealValue) ? 0 : dealValue,
        stage,
        recommendedTier,
        leadScore,
        roleLeader: getVal(leaderIdx) || "Kai (Brand Lead)",
        needs,
        timeline: getVal(timelineIdx) || "4 Weeks",
        location: getVal(locationIdx) || undefined,
        websiteUrl: getVal(websiteIdx) || undefined,
        industry: getVal(industryIdx) || undefined,
        notes: getVal(notesIdx) || undefined,
        isValid,
        validationError: !isValid ? "Missing contact/company information" : undefined,
      });
    }

    if (rows.length === 0) {
      setParsingError("No valid rows could be extracted from the provided file.");
      return;
    }

    setFileName(name);
    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCsvText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParsingError("Please select a standard .csv file format.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCsvText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setParsingError(null);

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: validRows }),
      });

      const json = await res.json();
      if (json?.ok && Array.isArray(json.data)) {
        onSuccess(json.data);
        resetState();
        onClose();
      } else {
        throw new Error(json?.error || "Server failed to import leads.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error importing leads.";
      setParsingError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const totalValueSum = parsedRows
    .filter((r) => r.isValid)
    .reduce((sum, r) => sum + r.dealValue, 0);

  return (
    <Modal
      open={open}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Upload Leads & Pipeline CSV"
    >
      <div className="space-y-5 text-white font-sans">
        {/* Banner with Download Sample Button */}
        <div className="p-4 bg-black/60 border border-[#262626] rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-mono text-xs font-bold text-[#FBD227] uppercase tracking-wider block">
              RECOMMENDED CSV SCHEMA
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Supports standard column headers or exports from HubSpot, Salesforce, Apollo, or GoHighLevel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="px-3 py-1.5 bg-[#181818] border border-[#383838] hover:border-[#FBD227] hover:text-[#FBD227] text-white font-mono text-xs font-bold uppercase transition-colors flex items-center gap-1.5 shrink-0"
              title="Download standard template with sample rows"
            >
              <Icon name="download" className="h-3.5 w-3.5" />
              Sample CSV
            </button>
            <button
              type="button"
              onClick={() => setShowSchemaGuide((prev) => !prev)}
              className="px-2.5 py-1.5 bg-black border border-[#2B2B2B] hover:border-gray-500 text-gray-400 text-xs font-mono transition-colors"
            >
              {showSchemaGuide ? "Hide Format" : "View Format"}
            </button>
          </div>
        </div>

        {/* Expandable Format Guide */}
        {showSchemaGuide && (
          <div className="p-3 bg-[#111111] border border-[#262626] rounded text-xs font-mono space-y-2 text-gray-300">
            <p className="text-[#FBD227] font-bold">Recommended Column Headers:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              <div>
                <strong className="text-white">Name*</strong>
                <span className="block text-gray-400">e.g. Arthur Pendelton</span>
              </div>
              <div>
                <strong className="text-white">Company*</strong>
                <span className="block text-gray-400">e.g. Tidewater Coffee</span>
              </div>
              <div>
                <strong className="text-white">Email*</strong>
                <span className="block text-gray-400">e.g. arthur@domain.com</span>
              </div>
              <div>
                <strong className="text-white">Phone</strong>
                <span className="block text-gray-400">e.g. +1 555-0199</span>
              </div>
              <div>
                <strong className="text-white">Deal Value</strong>
                <span className="block text-gray-400">e.g. 5500 or $5,500</span>
              </div>
              <div>
                <strong className="text-white">Stage</strong>
                <span className="block text-gray-400">new, qualified, won...</span>
              </div>
              <div>
                <strong className="text-white">Lead Score</strong>
                <span className="block text-gray-400">Hot, Warm, Cold</span>
              </div>
              <div>
                <strong className="text-white">Recommended Tier</strong>
                <span className="block text-gray-400">Focused, Growth, Integrated</span>
              </div>
              <div>
                <strong className="text-white">Needs / Services</strong>
                <span className="block text-gray-400">Brand, Web, Next.js</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 pt-1 border-t border-[#222222]">
              * At least one of Name or Company is required. Missing emails default to clean company handles.
            </p>
          </div>
        )}

        {/* Upload Drop Zone */}
        {parsedRows.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed p-8 text-center rounded-sm cursor-pointer transition-colors ${
              isDragging
                ? "border-[#FBD227] bg-[#FBD227]/5"
                : "border-[#333333] bg-[#0A0A0A] hover:border-[#FBD227] hover:bg-[#111111]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="p-3 rounded-full bg-white/5 border border-white/10 text-[#FBD227]">
                <Icon name="upload" className="h-6 w-6" />
              </div>
              <div>
                <span className="font-mono text-sm font-bold text-white block">
                  Drag and drop your Leads CSV file here
                </span>
                <span className="text-xs text-gray-400 font-sans block mt-0.5">
                  or click to browse your local computer
                </span>
              </div>
              <span className="font-mono text-[10px] text-gray-400 bg-black/60 px-2 py-0.5 rounded border border-[#222222]">
                Supports RFC 4180 .csv files up to 5,000 rows
              </span>
            </div>
          </div>
        ) : (
          /* File Selected & Parsed Preview */
          <div className="space-y-3">
            <div className="p-3 bg-[#111111] border border-[#262626] rounded-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#FBD227] font-mono text-xs font-bold">📄 {fileName}</span>
                <span className="font-mono text-xs text-gray-400">
                  ({validCount} valid lead{validCount !== 1 ? "s" : ""})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  Value: ${totalValueSum.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={resetState}
                  className="text-xs text-gray-400 hover:text-white underline font-mono"
                >
                  Choose Different File
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="max-h-64 overflow-y-auto border border-[#262626] rounded bg-black">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead className="bg-[#161616] text-[#FBD227] uppercase text-[10px] sticky top-0 z-10 border-b border-[#262626]">
                  <tr>
                    <th className="p-2.5">Company / Prospect</th>
                    <th className="p-2.5">Contact Email</th>
                    <th className="p-2.5 text-right">Value</th>
                    <th className="p-2.5">Stage</th>
                    <th className="p-2.5">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] text-gray-300 text-[11px]">
                  {parsedRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-2.5">
                        <strong className="text-white block">{r.company}</strong>
                        <span className="text-[10px] text-gray-400">{r.name}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="text-gray-300">{r.email}</span>
                        {r.phone && <span className="block text-[10px] text-gray-400">{r.phone}</span>}
                      </td>
                      <td className="p-2.5 text-right font-bold text-[#FBD227]">
                        ${r.dealValue.toLocaleString()}
                      </td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 uppercase">
                          {r.stage.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            r.leadScore === "Hot"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : r.leadScore === "Warm"
                              ? "bg-amber-500/20 text-[#FBD227] border-amber-500/30"
                              : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {r.leadScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error notification */}
        {parsingError && (
          <div className="p-3 bg-red-950/50 border border-red-500/40 text-red-200 text-xs font-mono rounded">
            ⚠️ {parsingError}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
          <span className="text-[11px] font-mono text-gray-400">
            {parsedRows.length > 0 ? `${validCount} leads ready to import` : "No file parsed yet"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetState();
                onClose();
              }}
              className={btnDark}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validCount === 0 || isSubmitting}
              onClick={handleImportSubmit}
              className={`${btnPrimary} flex items-center gap-1.5`}
            >
              <Icon name="upload" className="h-3.5 w-3.5" />
              {isSubmitting ? "Importing Leads…" : `Import ${validCount} Leads`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
