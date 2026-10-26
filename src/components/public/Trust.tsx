import React from "react";
import { siteData } from "@/data/siteData";
import { IndexBadge } from "./ui";

export const Trust: React.FC = () => {
  return (
    <section
      aria-label="Studio credibility and standards"
      className="relative border-y border-white/10 bg-[#090909] text-white"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/30 to-transparent"
      />

      <ul className="mx-auto grid max-w-[96rem] 2xl:max-w-[104rem] grid-cols-1 divide-y divide-white/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-10 2xl:px-12">
        {siteData.trust.items.map((item, idx) => (
          <li
            key={item.id}
            className="group grid grid-cols-[3rem_1fr] gap-x-4 py-7 transition-colors duration-200 hover:bg-white/[0.02] sm:block sm:px-8 sm:py-9 sm:first:pl-0 sm:last:pr-0"
          >
            <div className="flex items-center gap-3 sm:mb-4">
              <IndexBadge index={idx + 1} size="sm" className="transition-transform duration-200 group-hover:scale-105" />
              <span className="hidden font-mono text-[0.625rem] tracking-[0.2em] text-zinc-500 uppercase sm:inline-block">
                SYS.0{idx + 1}
              </span>
            </div>
            <div>
              <h2 className="font-monument text-sm font-bold uppercase leading-[1.3] text-white transition-colors duration-200 group-hover:text-[#F5C518] sm:text-base">
                {item.title}
              </h2>
              <p className="mt-2.5 max-w-[40ch] 2xl:max-w-[48ch] font-sans text-sm leading-[1.65] text-zinc-400 sm:text-[0.95rem]">
                {item.desc}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
