"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Proposal } from "@/db";
import { Logo } from "@/components/public/Logo";
import { Icon } from "@/components/icons/Icon";

export default function PublicProposalPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [load, setLoad] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptedInfo, setAcceptedInfo] = useState<{ projectId: string; invoiceNumber: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    // The token is what authorises this page, so it is read from the URL rather than the route.
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    fetch(`/api/proposals/public?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (res.status === 404) {
          setLoad("not_found");
        } else if (res.ok && json?.ok && json.data) {
          setProposal(json.data);
          setLoad("ready");
        } else {
          setLoad("error");
        }
      })
      .catch(() => setLoad("error"));
  }, [id]);

  const handleDecision = async (action: "accept" | "decline") => {
    if (!proposal || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const token = new URLSearchParams(window.location.search).get("token") ?? "";
      const res = await fetch("/api/proposals/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: proposal.id, token, action }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.data) {
        setProposal(json.data);
        if (json.accepted) setAcceptedInfo(json.accepted);
      } else {
        setActionError(json?.error ?? "Could not process your response. Please try again.");
      }
    } catch {
      setActionError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-[#FBD227] selection:text-black font-sans">
      <header className="flex items-center justify-between gap-4 border-b border-[#262626] px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" aria-label="The Virtus Labs — Home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3 font-mono text-xs text-gray-400">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 border border-[#333333] bg-[#141414] hover:border-white text-white uppercase font-bold transition-colors"
          >
            Print / Save PDF
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        {load === "loading" && (
          <div className="border border-[#262626] bg-[#111111] p-12 text-center font-mono text-sm text-gray-400">
            Loading Statement of Work & Proposal…
          </div>
        )}

        {load === "not_found" && (
          <div className="border border-[#262626] bg-[#111111] p-12 text-center space-y-4">
            <h1 className="font-monument text-2xl font-bold uppercase text-white">Proposal Not Found</h1>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              This proposal link may have expired or been removed. Please reach out to your studio director at{" "}
              <a href="mailto:hello@thevirtuslabs.com" className="text-[#FBD227] underline">
                hello@thevirtuslabs.com
              </a>
              .
            </p>
          </div>
        )}

        {load === "error" && (
          <div className="border border-[#DD7230] bg-[#DD7230]/10 p-8 text-center space-y-3">
            <p className="font-mono text-sm text-white">Could not load the proposal right now. Please refresh to try again.</p>
          </div>
        )}

        {load === "ready" && proposal && (
          <div className="space-y-8">
            {/* Accepted Banner */}
            {proposal.status === "Accepted" && (
              <div className="border border-emerald-500/50 bg-emerald-950/40 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                    <Icon name="check" className="h-4 w-4" />
                    <span>Proposal Accepted & Active</span>
                  </div>
                  <p className="text-sm text-gray-200">
                    Thank you, <strong>{proposal.clientName}</strong>. Your project workspace is active in the{" "}
                    <strong className="text-[#FBD227]">Discover</strong> phase.
                    {acceptedInfo ? ` Deposit invoice ${acceptedInfo.invoiceNumber} has been issued.` : ""}
                  </p>
                </div>
                <Link
                  href="/client/login"
                  className="px-4 py-2.5 bg-[#FBD227] text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors shrink-0 text-center"
                >
                  Enter Client Portal &rarr;
                </Link>
              </div>
            )}

            {/* Proposal Document Card */}
            <div className="border border-[#262626] bg-[#0D0D0D] p-6 sm:p-10 rounded-lg space-y-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#262626] pb-6">
                <div>
                  <span className="font-mono text-xs text-[#FBD227] uppercase tracking-widest block font-bold">
                    THE VIRTUS LABS · STATEMENT OF WORK
                  </span>
                  <h1 className="font-monument text-2xl sm:text-3xl font-black text-white uppercase mt-2">
                    {proposal.title}
                  </h1>
                  <p className="font-mono text-xs text-gray-400 mt-1">
                    Reference: <strong className="text-white">{proposal.proposalNumber}</strong> · Issued {proposal.createdAt}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center px-3 py-1 rounded text-xs font-mono font-bold uppercase border self-start ${
                    proposal.status === "Accepted"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : proposal.status === "Declined"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-[#FBD227]/15 text-[#FBD227] border-[#FBD227]/40"
                  }`}
                >
                  {proposal.status}
                </span>
              </div>

              {/* Client & Commercial Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#141414] border border-[#262626] p-5 rounded-lg font-mono text-xs">
                <div>
                  <span className="text-gray-400 uppercase block text-[10px]">Prepared For</span>
                  <strong className="text-white text-sm block mt-1">{proposal.company}</strong>
                  <span className="text-gray-400">{proposal.clientName}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase block text-[10px]">Estimated Delivery</span>
                  <strong className="text-white text-sm block mt-1">{proposal.timeline || "4 Weeks Delivery"}</strong>
                  {proposal.validUntil && <span className="text-gray-400">Valid until {proposal.validUntil}</span>}
                </div>
                <div>
                  <span className="text-gray-400 uppercase block text-[10px]">Total Investment</span>
                  <strong className="text-[#FBD227] text-xl font-black block mt-0.5">
                    ${proposal.amount.toLocaleString("en-US")}
                  </strong>
                  <span className="text-gray-400">50% deposit to initiate</span>
                </div>
              </div>

              {/* Deliverables & Scope */}
              <div className="space-y-4">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
                  Included Scope & Deliverables
                </h2>
                {proposal.scopeSummary && proposal.scopeSummary.length > 0 ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {proposal.scopeSummary.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 bg-[#141414] border border-[#222222] p-3.5 rounded text-sm text-gray-200"
                      >
                        <span className="text-[#FBD227] font-mono font-bold">0{idx + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">Full end-to-end architecture, design, and engineering sprint.</p>
                )}
              </div>

              {/* Payment Schedule */}
              <div className="border-t border-[#262626] pt-6 space-y-3">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
                  Milestone Settlement Structure
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div className="border border-[#262626] bg-black p-4 rounded">
                    <span className="text-gray-400 block">Milestone 1 · Project Kickoff Deposit (50%)</span>
                    <strong className="text-white text-base block mt-1">
                      ${Math.round(proposal.amount * 0.5).toLocaleString("en-US")}
                    </strong>
                  </div>
                  <div className="border border-[#262626] bg-black p-4 rounded">
                    <span className="text-gray-400 block">Milestone 2 · Final Handover & Launch (50%)</span>
                    <strong className="text-white text-base block mt-1">
                      ${Math.round(proposal.amount * 0.5).toLocaleString("en-US")}
                    </strong>
                  </div>
                </div>
              </div>

              {actionError && (
                <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 font-mono text-xs text-white">
                  {actionError}
                </p>
              )}

              {/* Interactive Client Approval Bar */}
              {(proposal.status === "Sent" || proposal.status === "Draft") && (
                <div className="border-t border-[#262626] pt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <p className="text-xs text-gray-400 max-w-md">
                    By clicking <strong>Accept &amp; Approve Proposal</strong>, your project workspace will be activated and your 50% deposit invoice will be generated.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision("decline")}
                      className="px-4 py-3 border border-[#333333] bg-[#141414] hover:border-red-500/50 hover:text-red-400 text-gray-300 font-mono text-xs font-bold uppercase transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDecision("accept")}
                      className="px-6 py-3 bg-[#FBD227] hover:bg-white text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      {submitting ? "Processing…" : "✓ Accept & Approve Proposal"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#262626] px-5 py-5 font-mono text-xs uppercase text-gray-500 sm:px-8 lg:px-10">
        <span>The Virtus Labs · Commercial Proposals</span>
        <span>hello@thevirtuslabs.com</span>
      </footer>
    </div>
  );
}
