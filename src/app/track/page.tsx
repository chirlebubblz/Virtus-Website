import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EnterDashboardButton } from "@/components/client/EnterDashboardButton";
import { Logo } from "@/components/public/Logo";
import { getTrackData } from "@/lib/track";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Welcome · The Virtus Labs",
  description: "Your project workspace at The Virtus Labs.",
  robots: { index: false, follow: false },
};

const nextSteps = [
  { title: "Kickoff call", desc: "Your account lead reaches out within one business day to lock in a kickoff time." },
  { title: "Share your brief", desc: "Send brand assets, references and access details so the team can start without delay." },
  { title: "Enter your dashboard", desc: "Follow milestones, review deliverables and request revisions in your client room." },
  { title: "First milestone", desc: "Your first deliverable lands in the dashboard for review and approval." },
];

const formatMoney = (n: number) => `$${n.toLocaleString("en-US")}`;
const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? { timeZone: "UTC" } : {}),
      })
    : null;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-[#FBD227] selection:text-black">
      <header className="flex items-center justify-between gap-4 border-b border-[#333333] px-5 py-4 sm:px-8 lg:px-10">
        <Link
          href="/"
          aria-label="The Virtus Labs — Home"
          className="focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
        >
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[74rem] flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        {children}
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#333333] px-5 py-5 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#999999] sm:px-8 lg:px-10">
        <span>The Virtus Labs · Client welcome</span>
        <span>One team. Limitless possibilities.</span>
      </footer>
    </div>
  );
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const result = await getTrackData(token);

  // No dead end: unknown, expired or missing links land on login, which also offers "Start a project".
  if (!result.ok) redirect(`/client/login?reason=${result.reason === "unavailable" ? "unavailable" : "link"}`);

  const { clientName, contactName, company, invoice, project } = result.data;
  const paidDate = formatDate(invoice?.paidAt);
  // Same greeting as the dashboard: the contact person, not the account name.
  const firstName =
    contactName.replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").split(" ")[0] || clientName.split(" ")[0] || "there";

  return (
    <Shell>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="block h-1 w-12 bg-[#FBD227]" />
        <span className="font-sans text-eyebrow font-bold uppercase">{invoice ? "Payment confirmed" : "Project room ready"}</span>
      </div>

      <h1 className="mt-6 font-monument text-[clamp(2.25rem,7vw,4rem)] font-bold uppercase leading-[1.1]">
        Welcome, <span className="text-[#FBD227]">{firstName}.</span>
      </h1>
      <p className="mt-5 max-w-[56ch] font-sans text-lg leading-[1.5]">
        {invoice
          ? `Thank you, ${company}. Your payment is received and your project room is ready. Here is what happens next.`
          : `Welcome, ${company}. Your project room is ready. Here is what happens next.`}
      </p>

      {(invoice || project) && (
        <dl className="mt-10 grid gap-px bg-[#333333] sm:grid-cols-3">
          {invoice && (
            <>
              <div className="bg-black p-5">
                <dt className="font-sans text-eyebrow font-bold uppercase text-[#999999]">Receipt</dt>
                <dd className="mt-2 font-display text-3xl leading-none">{invoice.invoiceNumber}</dd>
              </div>
              <div className="bg-black p-5">
                <dt className="font-sans text-eyebrow font-bold uppercase text-[#999999]">Amount paid</dt>
                <dd className="mt-2 font-display text-3xl leading-none">
                  {formatMoney(invoice.amount)}
                  {paidDate && (
                    <span className="mt-2 block font-sans text-xs font-semibold text-[#999999]">{paidDate}</span>
                  )}
                </dd>
              </div>
            </>
          )}
          {project && (
            <div className="bg-black p-5">
              <dt className="font-sans text-eyebrow font-bold uppercase text-[#999999]">Project</dt>
              <dd className="mt-2 font-sans text-base font-semibold leading-snug">
                {project.title}
                <span className="mt-1 block text-xs uppercase text-[#FBD227]">{project.phase}</span>
              </dd>
            </div>
          )}
        </dl>
      )}

      <h2 className="mt-14 font-monument text-xl font-bold uppercase sm:text-2xl">What happens next</h2>
      <ol className="mt-6 grid gap-5 md:grid-cols-2">
        {nextSteps.map((step, i) => (
          <li key={step.title} className="relative bg-white py-6 pl-9 pr-6 text-black">
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2 bg-[#DD7230]" />
            <span className="font-display text-3xl leading-none">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 font-monument text-base font-bold uppercase leading-[1.15]">{step.title}</h3>
            <p className="mt-2 font-sans text-base leading-[1.6] text-[#333333]">{step.desc}</p>
          </li>
        ))}
      </ol>

      <section className="mt-14 border-t border-[#333333] pt-10">
        <p className="max-w-[56ch] font-sans text-lg leading-[1.5]">
          We are glad to have you on board. Your dashboard is where every update, file and approval lives.
        </p>
        <div className="mt-6">
          <EnterDashboardButton token={token as string} />
        </div>
      </section>
    </Shell>
  );
}
