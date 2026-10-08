"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Contract } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { useClients } from "./useClients";
import { errorText, workspaceApi } from "./api";
import { Modal, fieldClass, labelClass, btnPrimary, btnDark } from "./ui";

const SIGNER_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ContractsView: React.FC = () => {
  // Contracts live in the database; every change goes through /api/contracts.
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [load, setLoad] = useState<"loading" | "ready" | "error">("loading");
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [signerNameInput, setSignerNameInput] = useState("");
  const [signerEmailInput, setSignerEmailInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [clientCompany, setClientCompany] = useState("");
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState<Contract["contractType"]>("Statement of Work (SOW)");
  const [value, setValue] = useState<string>("");

  const { clients, loading: loadingClients } = useClients();
  useEffect(() => {
    if (!clientCompany && clients[0]) setClientCompany(clients[0].company);
  }, [clients, clientCompany]);

  const loadContracts = useCallback(() => {
    setLoad("loading");
    workspaceApi<Contract[]>("/api/contracts")
      .then((data) => {
        setContracts(data);
        setLoad("ready");
      })
      .catch(() => setLoad("error"));
  }, []);

  useEffect(loadContracts, [loadContracts]);

  const openDraft = () => {
    setFormError(null);
    setIsDraftModalOpen(true);
  };

  const openSigning = (c: Contract) => {
    setFormError(null);
    setSigningContract(c);
    setSignerNameInput(c.clientName);
    setSignerEmailInput("");
  };

  const handleDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const selectedClient = clients.find((c) => c.company === clientCompany);
    const amount = value.trim() === "" ? 0 : Number(value); // 0 is valid, for example an NDA
    if (!selectedClient) return setFormError("Choose a client.");
    if (!title.trim()) return setFormError("Enter a title.");
    if (!Number.isFinite(amount) || amount < 0) return setFormError("Enter a valid contract value.");

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await workspaceApi<Contract>("/api/contracts", "POST", {
        clientId: selectedClient.id,
        title: title.trim(),
        contractType,
        value: amount,
      });
      setContracts((list) => [created, ...list]);
      setIsDraftModalOpen(false);
      setTitle("");
      setValue("");
    } catch (err) {
      setFormError(errorText(err, "Could not create the agreement."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingContract || submitting) return;
    if (!signerNameInput.trim()) return setFormError("Enter the signer's name.");
    if (!SIGNER_EMAIL.test(signerEmailInput.trim())) return setFormError("Enter a valid signer email.");

    setSubmitting(true);
    setFormError(null);
    try {
      const saved = await workspaceApi<Contract>("/api/contracts", "PATCH", {
        id: signingContract.id,
        signerName: signerNameInput.trim(),
        signerEmail: signerEmailInput.trim(),
      });
      setContracts((list) => list.map((c) => (c.id === saved.id ? saved : c)));
      setSigningContract(null);
      setSignerNameInput("");
      setSignerEmailInput("");
    } catch (err) {
      setFormError(errorText(err, "Could not record the signature."));
    } finally {
      setSubmitting(false);
    }
  };

  const formAlert = formError && (
    <p role="alert" className="border border-[#DD7230] bg-[#DD7230]/10 px-3 py-2 font-sans text-xs text-white">
      {formError}
    </p>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-white font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
              Operations OS · Agreements
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 uppercase">
            Contracts & Agreements
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Draft client agreements and record formal legal and e-signature execution.
          </p>
        </div>

        <button
          type="button"
          onClick={openDraft}
          className={btnPrimary}
        >
          + Draft agreement
        </button>
      </div>

      {load === "error" && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-[#DD7230] bg-[#DD7230]/10 px-4 py-3 text-xs">
          <span>Agreements could not be loaded. Check your connection and try again.</span>
          <button type="button" onClick={loadContracts} className={btnDark}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Total Executed Agreements</span>
          <span className="font-mono text-2xl font-black text-white">
            {contracts.filter((c) => c.status === "Signed").length} / {contracts.length}
          </span>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Under Contract Value</span>
          <span className="font-mono text-2xl font-black text-[#FBD227]">
            ${contracts.filter((c) => c.status === "Signed").reduce((a, b) => a + b.value, 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-[#111111] border border-[#262626] p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-400 block mb-1">Pending Client e-Signature</span>
          <span className="font-mono text-2xl font-black text-amber-400">
            {contracts.filter((c) => c.status === "Pending Signature").length}
          </span>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] font-mono text-xs uppercase text-gray-400 bg-[#161616]">
                <th className="py-3 px-4">Contract Ref & Type</th>
                <th className="py-3 px-4">Agreement Title</th>
                <th className="py-3 px-4">Counterparty / Client</th>
                <th className="py-3 px-4">Contract Value</th>
                <th className="py-3 px-4">Signing Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-xs">
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center font-mono text-xs font-bold text-gray-400">
                    {load === "loading" ? "Loading agreements…" : "No agreements yet. Draft your first one."}
                  </td>
                </tr>
              )}
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3 px-4 font-mono">
                    <span className="font-bold text-[#FBD227] block">{c.contractNumber}</span>
                    <span className="text-[0.68rem] text-gray-400">{c.contractType}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-white block">{c.title}</span>
                    <span className="text-[0.68rem] text-gray-400 font-mono">Created {c.createdAt}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-gray-200 block">{c.company}</span>
                    <span className="text-[0.68rem] text-gray-400 font-mono">{c.clientName}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {c.value === 0 ? "Non-monetary (NDA)" : `$${c.value.toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                        c.status === "Signed"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-[#FBD227] border-amber-500/30"
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.signedAt && (
                      <span className="text-xs font-mono text-emerald-400 block mt-0.5">
                        {c.signedAt}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {c.status === "Pending Signature" ? (
                      <button
                        type="button"
                        onClick={() => openSigning(c)}
                        className="px-3 py-1 bg-[#FBD227] text-black font-mono text-xs font-bold rounded hover:bg-white transition-colors"
                      >
                        <Icon name="signature" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Record signature
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-gray-400">Signed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record signature modal */}
      <Modal
        open={signingContract !== null}
        onClose={() => setSigningContract(null)}
        title={signingContract ? `Record signature: ${signingContract.contractNumber}` : "Record signature"}
      >
        {signingContract && (
          <form onSubmit={handleExecuteSignature} className="space-y-4 font-mono text-xs text-white">
            <div className="p-3 bg-[#161616] rounded border border-[#262626]">
              <span className="text-xs text-gray-400 uppercase font-bold block">Document</span>
              <p className="font-bold text-white font-monument">{signingContract.title}</p>
              <p className="text-gray-400 mt-0.5">Counterparty: {signingContract.company}</p>
            </div>

            <div>
              <label htmlFor="sign-field-1" className={labelClass}>
                Signer name *
              </label>
              <input id="sign-field-1"
                type="text"
                required
                value={signerNameInput}
                onChange={(e) => setSignerNameInput(e.target.value)}
                placeholder="e.g. Elena Vance, MD"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="sign-field-2" className={labelClass}>
                Signer email *
              </label>
              <input id="sign-field-2"
                type="email"
                required
                value={signerEmailInput}
                onChange={(e) => setSignerEmailInput(e.target.value)}
                placeholder="elena@meridianhealth.org"
                className={fieldClass}
              />
            </div>

            {formAlert}

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSigningContract(null)}
                disabled={submitting}
                className={btnDark}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={btnPrimary}
              >
                {submitting ? "Saving…" : "Record signature"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Draft Contract Modal */}
      <Modal open={isDraftModalOpen} onClose={() => setIsDraftModalOpen(false)} title="Draft agreement">
        <div>
          <form onSubmit={handleDraft} className="space-y-4 font-mono text-xs text-white">
            <div>
              <label htmlFor="sign-field-3" className={labelClass}>
                Contract Type
              </label>
              <select id="sign-field-3"
                value={contractType}
                onChange={(e) => setContractType(e.target.value as Contract["contractType"])}
                className={fieldClass}
              >
                <option value="Statement of Work (SOW)">Statement of Work (SOW)</option>
                <option value="Master Service Agreement (MSA)">Master Service Agreement (MSA)</option>
                <option value="Retainer Agreement">Retainer Agreement</option>
                <option value="NDA">Mutual Non-Disclosure Agreement (NDA)</option>
              </select>
            </div>

            <div>
              <label htmlFor="sign-field-4" className={labelClass}>
                Counterparty Client
              </label>
              <select id="sign-field-4"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                className={fieldClass}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.company}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="mt-1.5 font-sans text-xs text-gray-400">
                  {loadingClients ? "Loading clients…" : "No clients yet. Add one in Clients first."}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="sign-field-5" className={labelClass}>
                Agreement Title *
              </label>
              <input id="sign-field-5"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Statement of Work: Custom AI Automation Build"
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="sign-field-6" className={labelClass}>
                Total Contract Consideration ($ USD)
              </label>
              <input id="sign-field-6"
                type="number"
                min={0}
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={fieldClass}
              />
            </div>

            <p className="font-sans text-xs text-gray-400">The contract number is assigned automatically.</p>

            {formAlert}

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDraftModalOpen(false)}
                disabled={submitting}
                className={btnDark}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={clients.length === 0 || submitting}
                className={btnPrimary}
              >
                {submitting ? "Creating…" : "Create agreement"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
