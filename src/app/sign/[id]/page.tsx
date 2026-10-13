"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Contract } from "@/db";
import { Logo } from "@/components/public/Logo";
import { Icon } from "@/components/icons/Icon";

export default function PublicContractSignPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [contract, setContract] = useState<Contract | null>(null);
  const [load, setLoad] = useState<"loading" | "ready" | "not_found" | "error">("loading");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/contracts/public?id=${encodeURIComponent(id)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (res.status === 404) {
          setLoad("not_found");
        } else if (res.ok && json?.ok && json.data) {
          setContract(json.data);
          setSignerName(json.data.clientName || "");
          setLoad("ready");
        } else {
          setLoad("error");
        }
      })
      .catch(() => setLoad("error"));
  }, [id]);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || submitting) return;
    if (!signerName.trim()) {
      setFormError("Please enter your full legal name.");
      return;
    }
    if (!signerEmail.trim()) {
      setFormError("Please enter your business email address.");
      return;
    }
    if (!consent) {
      setFormError("Please check the box to confirm your digital signature.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/contracts/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contract.id,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json.data) {
        setContract(json.data);
      } else {
        setFormError(json?.error ?? "Could not record your signature. Please try again.");
      }
    } catch {
      setFormError("Network error. Please check your connection and try again.");
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
            Print / Save Copy
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        {load === "loading" && (
          <div className="border border-[#262626] bg-[#111111] p-12 text-center font-mono text-sm text-gray-400">
            Loading Legal Agreement…
          </div>
        )}

        {load === "not_found" && (
          <div className="border border-[#262626] bg-[#111111] p-12 text-center space-y-4">
            <h1 className="font-monument text-2xl font-bold uppercase text-white">Agreement Not Found</h1>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              This signing link may have expired or been removed. Please reach out to{" "}
              <a href="mailto:hello@thevirtuslabs.com" className="text-[#FBD227] underline">
                hello@thevirtuslabs.com
              </a>
              .
            </p>
          </div>
        )}

        {load === "error" && (
          <div className="border border-[#DD7230] bg-[#DD7230]/10 p-8 text-center">
            <p className="font-mono text-sm text-white">Could not load the agreement right now. Please refresh to try again.</p>
          </div>
        )}

        {load === "ready" && contract && (
          <div className="space-y-8">
            {contract.status === "Signed" && (
              <div className="border border-emerald-500/50 bg-emerald-950/40 p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                    <Icon name="check" className="h-4 w-4" />
                    <span>Electronically Executed &amp; Verified</span>
                  </div>
                  <p className="text-sm text-gray-200">
                    Signed by <strong>{contract.signerName}</strong> ({contract.signerEmail}) on{" "}
                    <span className="font-mono text-xs text-emerald-300">{contract.signedAt}</span>.
                  </p>
                </div>
                <Link
                  href="/client/login"
                  className="px-4 py-2.5 bg-[#FBD227] text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors shrink-0 text-center"
                >
                  Client Portal &rarr;
                </Link>
              </div>
            )}

            <div className="border border-[#262626] bg-[#0D0D0D] p-6 sm:p-10 rounded-lg space-y-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#262626] pb-6">
                <div>
                  <span className="font-mono text-xs text-[#FBD227] uppercase tracking-widest block font-bold">
                    {contract.contractType}
                  </span>
                  <h1 className="font-monument text-2xl sm:text-3xl font-black text-white uppercase mt-2">
                    {contract.title}
                  </h1>
                  <p className="font-mono text-xs text-gray-400 mt-1">
                    Contract Ref: <strong className="text-white">{contract.contractNumber}</strong> · Drafted {contract.createdAt}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center px-3 py-1 rounded text-xs font-mono font-bold uppercase border self-start ${
                    contract.status === "Signed"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/20 text-[#FBD227] border-amber-500/30"
                  }`}
                >
                  {contract.status}
                </span>
              </div>

              {/* Counterparties */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#141414] border border-[#262626] p-5 rounded-lg font-mono text-xs">
                <div>
                  <span className="text-gray-400 uppercase block text-[10px]">Service Provider</span>
                  <strong className="text-white text-sm block mt-1">The Virtus Labs</strong>
                  <span className="text-gray-400">hello@thevirtuslabs.com</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase block text-[10px]">Client Counterparty</span>
                  <strong className="text-white text-sm block mt-1">{contract.company}</strong>
                  <span className="text-gray-400">{contract.clientName}</span>
                </div>
                <div>
                  <span className="text-gray-400 uppercase block text-[10px]">Contract Value</span>
                  <strong className="text-[#FBD227] text-lg font-black block mt-0.5">
                    {contract.value === 0 ? "Non-Monetary (NDA)" : `$${contract.value.toLocaleString("en-US")}`}
                  </strong>
                </div>
              </div>

              {/* Standard Clauses */}
              <div className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed bg-[#111111] border border-[#222222] p-6 rounded space-y-3">
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FBD227]">
                  Terms of Engagement &amp; Execution
                </h2>
                <p>
                  <strong>1. Scope &amp; Deliverables:</strong> The Virtus Labs agrees to perform the creative, engineering, and strategic services outlined in the associated Statement of Work for <strong>{contract.company}</strong>.
                </p>
                <p>
                  <strong>2. Intellectual Property &amp; Ownership:</strong> Upon full settlement of the contract value, all custom code, design assets, and deliverables created specifically for the Client transfer in full to <strong>{contract.company}</strong>.
                </p>
                <p>
                  <strong>3. Confidentiality:</strong> Both parties agree to maintain strict confidentiality regarding proprietary business data, credentials, and trade secrets shared during the engagement.
                </p>
                <p>
                  <strong>4. Electronic Execution:</strong> By executing this document electronically below, the undersigned warrants that they have full authority to bind <strong>{contract.company}</strong> to this agreement.
                </p>
              </div>

              {/* E-Signature Section */}
              {contract.status === "Signed" ? (
                <div className="border border-emerald-500/40 bg-black p-6 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-6 font-mono text-xs">
                  <div>
                    <span className="text-gray-400 uppercase block text-[10px]">Executed By (Studio)</span>
                    <p className="font-serif italic text-xl text-white mt-2">Vic Torres</p>
                    <span className="text-gray-400 block mt-1">The Virtus Labs · Studio Director</span>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase block text-[10px]">Executed By (Client)</span>
                    <p className="font-serif italic text-xl text-[#FBD227] mt-2">{contract.signerName}</p>
                    <span className="text-gray-400 block mt-1">
                      {contract.signerEmail} · {contract.signedAt}
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSign} className="border-t border-[#262626] pt-6 space-y-5">
                  <h3 className="font-monument text-base font-bold uppercase text-white">
                    Digital E-Signature Execution
                  </h3>

                  {formError && (
                    <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 font-mono text-xs text-white">
                      {formError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="signer-name" className="block font-mono text-xs uppercase text-gray-400 mb-1.5">
                        Full Legal Name *
                      </label>
                      <input
                        id="signer-name"
                        type="text"
                        required
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="e.g. Brandon Henry"
                        className="w-full border border-[#333333] bg-black px-3.5 py-2.5 text-sm text-white focus:border-[#FBD227] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="signer-email" className="block font-mono text-xs uppercase text-gray-400 mb-1.5">
                        Signer Business Email *
                      </label>
                      <input
                        id="signer-email"
                        type="email"
                        required
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full border border-[#333333] bg-black px-3.5 py-2.5 text-sm text-white focus:border-[#FBD227] focus:outline-none"
                      />
                    </div>
                  </div>

                  {signerName.trim() && (
                    <div className="border border-[#262626] bg-black p-4 rounded">
                      <span className="font-mono text-[10px] uppercase text-gray-500 block">Digital Signature Preview</span>
                      <p className="font-serif italic text-2xl text-[#FBD227] mt-1">{signerName}</p>
                    </div>
                  )}

                  <label className="flex items-start gap-2.5 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#FBD227]"
                    />
                    <span>
                      I agree that my electronic signature above constitutes a legally binding execution of{" "}
                      <strong>{contract.contractNumber}</strong> on behalf of <strong>{contract.company}</strong>.
                    </span>
                  </label>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-3 bg-[#FBD227] hover:bg-white text-black font-mono text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      {submitting ? "Recording Signature…" : "✍️ Execute & E-Sign Agreement"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#262626] px-5 py-5 font-mono text-xs uppercase text-gray-500 sm:px-8 lg:px-10">
        <span>The Virtus Labs · Legal &amp; Compliance</span>
        <span>hello@thevirtuslabs.com</span>
      </footer>
    </div>
  );
}
