"use client";

import React, { useEffect, useState } from "react";
import { db, Contract } from "@/db";
import { Icon } from "@/components/icons/Icon";
import { useClients } from "./useClients";
import { Modal, fieldClass } from "./ui";

const SIGNER_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TYPE_CODE: Record<Contract["contractType"], string> = {
  "Master Service Agreement (MSA)": "MSA",
  "Statement of Work (SOW)": "SOW",
  "Retainer Agreement": "RET",
  NDA: "NDA",
};

/** Next CODE-YYYY-NNN in sequence per type, so numbers never collide. */
function nextContractNumber(existing: Contract[], type: Contract["contractType"]): string {
  const code = TYPE_CODE[type];
  const year = new Date().getFullYear();
  const used = existing
    .map((c) => new RegExp(`^${code}-${year}-(\\d+)$`).exec(c.contractNumber)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  return `${code}-${year}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

export const ContractsView: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>(() => db.getContracts());
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [signerNameInput, setSignerNameInput] = useState("");
  const [signerEmailInput, setSignerEmailInput] = useState("");

  // Form State
  const [clientCompany, setClientCompany] = useState("");
  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState<Contract["contractType"]>("Statement of Work (SOW)");
  const [value, setValue] = useState<string>("");

  const { clients, loading: loadingClients } = useClients();
  useEffect(() => {
    if (!clientCompany && clients[0]) setClientCompany(clients[0].company);
  }, [clients, clientCompany]);

  const handleDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = clients.find((c) => c.company === clientCompany);
    const amount = value.trim() === "" ? 0 : Number(value); // 0 is valid, for example an NDA
    if (!title.trim() || !selectedClient || !Number.isFinite(amount) || amount < 0) return;

    db.addContract({
      contractNumber: nextContractNumber(db.getContracts(), contractType),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      company: selectedClient.company,
      title: title.trim(),
      contractType,
      value: amount,
      status: "Pending Signature",
    });

    setContracts(db.getContracts());
    setIsDraftModalOpen(false);
    setTitle("");
    setValue("");
  };

  const handleExecuteSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingContract || !signerNameInput.trim() || !SIGNER_EMAIL.test(signerEmailInput.trim())) return;
    if (signingContract.status === "Signed") return;

    db.signContract(signingContract.id, signerNameInput.trim(), signerEmailInput.trim());
    setContracts(db.getContracts());
    setSigningContract(null);
    setSignerNameInput("");
    setSignerEmailInput("");
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 text-[#000000]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
              Operations OS · Agreements
            </span>
          </div>
          <h1 className="font-monument text-2xl sm:text-3xl font-black text-[#000000] tracking-tight mt-1 uppercase">
            Contracts & Agreements
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Draft agreements and record when the client has signed. Changes here are not saved yet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDraftModalOpen(true)}
          className="border-2 border-black bg-black text-[#FBD227] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#FBD227] hover:text-black transition-colors"
        >
          + Draft agreement
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Total Executed Agreements</span>
          <span className="font-mono text-2xl font-black text-black">
            {contracts.filter((c) => c.status === "Signed").length} / {contracts.length}
          </span>
        </div>
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Under Contract Value</span>
          <span className="font-mono text-2xl font-black text-black">
            ${contracts.filter((c) => c.status === "Signed").reduce((a, b) => a + b.value, 0).toLocaleString()}
          </span>
        </div>
        <div className="bg-white border border-gray-300 p-4 rounded-lg shadow-2xs">
          <span className="font-mono text-xs text-gray-500 block mb-1">Pending Client e-Signature</span>
          <span className="font-mono text-2xl font-black text-amber-700">
            {contracts.filter((c) => c.status === "Pending Signature").length}
          </span>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 font-mono text-xs uppercase text-gray-500 bg-gray-50">
                <th className="py-3 px-4">Contract Ref & Type</th>
                <th className="py-3 px-4">Agreement Title</th>
                <th className="py-3 px-4">Counterparty / Client</th>
                <th className="py-3 px-4">Contract Value</th>
                <th className="py-3 px-4">Signing Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center font-mono text-xs font-bold text-gray-700">
                    No agreements yet. Draft your first one.
                  </td>
                </tr>
              )}
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono">
                    <span className="font-bold text-gray-900 block">{c.contractNumber}</span>
                    <span className="text-[0.68rem] text-gray-500">{c.contractType}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-gray-900 block">{c.title}</span>
                    <span className="text-[0.68rem] text-gray-400 font-mono">Created {c.createdAt}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-gray-800 block">{c.company}</span>
                    <span className="text-[0.68rem] text-gray-500 font-mono">{c.clientName}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-black">
                    {c.value === 0 ? "Non-monetary (NDA)" : `$${c.value.toLocaleString()}`}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        c.status === "Signed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.signedAt && (
                      <span className="text-xs font-mono text-gray-400 block mt-0.5">
                        {c.signedAt}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {c.status === "Pending Signature" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSigningContract(c);
                          setSignerNameInput(c.clientName);
                        }}
                        className="px-3 py-1 bg-[#FBD227] text-black border border-black font-mono text-xs font-bold rounded hover:bg-black hover:text-[#FBD227] transition-colors"
                      >
                        <Icon name="signature" className="mr-1.5 inline h-4 w-4 align-[-0.2em]" />Record signature
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-gray-600">Signed</span>
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
        <div>
            <form onSubmit={handleExecuteSignature} className="space-y-4 font-mono text-xs">
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <span className="text-xs text-gray-400 uppercase font-bold block">Document</span>
                <p className="font-bold text-black">{signingContract.title}</p>
                <p className="text-gray-500 mt-0.5">Counterparty: {signingContract.company}</p>
              </div>

              <div>
                <label htmlFor="sign-field-1" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                <label htmlFor="sign-field-2" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSigningContract(null)}
                  className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-[#FBD227] border-2 border-black font-bold uppercase tracking-wider hover:bg-[#FBD227] hover:text-black transition-colors"
                >
                  Record signature
                </button>
              </div>
            </form>
        </div>
        )}
      </Modal>

      {/* Draft Contract Modal */}
      <Modal open={isDraftModalOpen} onClose={() => setIsDraftModalOpen(false)} title="Draft agreement">
        <div>
            <form onSubmit={handleDraft} className="space-y-4 font-mono text-xs">
              <div>
                <label htmlFor="sign-field-3" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                <label htmlFor="sign-field-4" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                  <p className="mt-1.5 font-sans text-xs text-gray-700">
                    {loadingClients ? "Loading clients…" : "No clients yet. Add one in Clients first."}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="sign-field-5" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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
                <label htmlFor="sign-field-6" className="block text-xs font-bold uppercase text-gray-700 mb-1">
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

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded font-bold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-[#FBD227] border-2 border-black font-bold uppercase tracking-wider hover:bg-[#FBD227] hover:text-black transition-colors"
                >
                  Create agreement
                </button>
              </div>
            </form>
        </div>
      </Modal>
    </div>
  );
};
