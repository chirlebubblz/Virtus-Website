import React from "react";
import { siteData } from "@/data/siteData";
import { IndexBadge } from "./ui";

export const Trust: React.FC = () => {
  return (
    <section aria-label="Studio credibility" className="border-y border-shelf bg-abyss-2">
      <ul className="mx-auto grid max-w-[88rem] grid-cols-1 divide-y divide-shelf px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-10">
        {siteData.trust.items.map((item, idx) => (
          <li key={item.id} className="grid grid-cols-[3rem_1fr] gap-x-3 py-6 sm:block sm:px-8 sm:py-8 sm:first:pl-0 sm:last:pr-0">
            <IndexBadge index={idx + 1} size="sm" className="sm:mb-4" />
            <div>
              <h2 className="font-monument text-sm font-bold uppercase leading-[1.3] text-white">{item.title}</h2>
              <p className="mt-2 max-w-[34ch] font-sans text-[0.95rem] leading-[1.6] text-tide">{item.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
