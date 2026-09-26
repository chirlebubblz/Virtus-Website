import React from "react";
import Link from "next/link";
import { Logo } from "@/components/public/Logo";
import { Icon } from "@/components/icons/Icon";

export const metadata = {
  title: "Workspace Portal · The Virtus Labs",
  description: "Workspace access for The Virtus Labs admin, team and client rooms.",
};

const doors = [
  {
    number: "01",
    href: "/admin",
    title: "Admin",
    label: "Operations desk",
    desc: "Manage leads, clients, projects, billing, contracts and studio infrastructure.",
    bar: "bg-black",
  },
  {
    number: "02",
    href: "/team",
    title: "Team member",
    label: "Sprint floor",
    desc: "Assigned delivery tasks, client deliverable files, calendar schedules and studio comms.",
    bar: "bg-[#854D27]",
  },
  {
    number: "03",
    href: "/client",
    title: "Client",
    label: "Client room",
    desc: "Review milestones, download deliverables, approve revisions and follow your project.",
    bar: "bg-[#DD7230]",
  },
];

export default function PortalGatewayPage() {
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
        <Link
          href="/"
          className="font-sans text-eyebrow font-bold uppercase text-white transition-colors hover:text-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
        >
          <span aria-hidden="true">← </span>Back to site
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[74rem] flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="block h-1 w-12 bg-[#FBD227]" />
          <span className="font-sans text-eyebrow font-bold uppercase text-white">
            Workspace portal
          </span>
        </div>

        <h1 className="mt-6 font-monument text-[clamp(2.25rem,7vw,4rem)] font-bold uppercase leading-[1.1] text-white">
          Choose your <span className="text-[#FBD227]">portal.</span>
        </h1>

        <p className="mt-5 max-w-[52ch] font-sans text-lg leading-[1.5] text-white">
          One team, three rooms. Pick the workspace that matches your role. Every room asks you to sign in.
        </p>

        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {doors.map((door) => (
            <li key={door.href} className="flex">
              <Link
                href={door.href}
                className="group relative flex w-full flex-col justify-between bg-white py-7 pl-9 pr-7 text-black transition-colors duration-200 hover:bg-[#FBD227] focus-visible:bg-[#FBD227] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-[#FBD227]"
              >
                <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-2 ${door.bar}`} />

                <div>
                  <span className="font-display text-4xl leading-none text-black">{door.number}</span>
                  <h2 className="mt-5 font-monument text-xl font-bold uppercase leading-[1.15] text-black sm:text-2xl">
                    {door.title}
                  </h2>
                  <p className="mt-4 font-sans text-base leading-[1.6] text-[#333333] group-hover:text-black group-focus-visible:text-black">
                    {door.desc}
                  </p>
                </div>

                <div className="mt-9 flex items-center justify-between border-t-2 border-black pt-4">
                  <span className="inline-flex items-center gap-2 font-sans text-eyebrow font-bold uppercase text-black">
                    <Icon name="lock" className="h-4 w-4" />
                    {door.label}
                    <span className="sr-only"> — sign-in required</span>
                  </span>
                  <Icon
                    name="arrow-right"
                    className="h-5 w-5 text-black transition-transform duration-200 group-hover:translate-x-1"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#333333] px-5 py-5 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-[#999999] sm:px-8 lg:px-10">
        <span>The Virtus Labs · Workspace portal</span>
        <span>One team. Limitless possibilities.</span>
      </footer>
    </div>
  );
}
