import React from "react";
import Link from "next/link";
import { siteData } from "@/data/siteData";
import { Icon } from "@/components/icons/Icon";
import type { PillarSlug } from "@/lib/servicePillars";

const pillars = siteData.services.pillars;

const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-[3px] focus-visible:outline-tvl-amber";

/** Tab strip linking the four discipline pages; the current one is filled amber. */
export function DisciplineNav({ current }: { current: PillarSlug }) {
  return (
    <nav aria-label="Disciplines" className="border-b border-shelf bg-black">
      <ul className="mx-auto grid w-full max-w-[88rem] grid-cols-2 lg:grid-cols-4">
        {pillars.map((p, idx) => {
          const active = p.slug === current;
          return (
            <li key={p.slug} className="border-shelf odd:border-r lg:border-r lg:last:border-r-0">
              <Link
                href={`/work/${p.slug}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[3.25rem] items-baseline gap-3 px-5 py-4 font-sans text-xs font-bold uppercase tracking-[0.12em] transition-colors sm:px-8 lg:px-10 ${focusRing} ${
                  active ? "bg-tvl-amber text-black" : "text-tide hover:text-white"
                }`}
              >
                <span aria-hidden="true">{String(idx + 1).padStart(2, "0")}</span>
                {p.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Cards pointing at the other three disciplines, shown above the closing CTA. */
export function DisciplineMore({ current }: { current: PillarSlug }) {
  const others = pillars.filter((p) => p.slug !== current);
  return (
    <section aria-label="Other disciplines" className="border-t border-shelf bg-black py-14 sm:py-20">
      <ul className="mx-auto grid w-full max-w-[88rem] gap-4 px-5 sm:px-8 md:grid-cols-3 lg:px-10">
        {others.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/work/${p.slug}`}
              className="group flex min-h-[5.5rem] items-center justify-between gap-4 rounded-xl border border-shelf p-6 transition-colors hover:border-tvl-amber focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-tvl-amber"
            >
              <span>
                <span className="block font-sans text-[0.7rem] font-bold uppercase tracking-[0.14em] text-tide">Also see</span>
                <span className="mt-2 block font-monument text-base font-bold uppercase text-white">{p.name}</span>
              </span>
              <Icon name="arrow-right" className="h-5 w-5 shrink-0 text-tvl-amber transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
