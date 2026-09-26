import React from "react";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";

interface ProductsProps {
  onOpenInquiry: () => void;
}

export const Products: React.FC<ProductsProps> = ({ onOpenInquiry }) => {
  return (
    <section id="products" aria-labelledby="products-title" className="scroll-mt-16 bg-tvl-amber py-16 text-black sm:py-24 lg:py-28">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-10">
        <SectionHeader
          tone="light"
          eyebrow={siteData.products.eyebrow}
          title={siteData.products.title}
          titleId="products-title"
          intro={siteData.products.intro}
          className="mb-10 sm:mb-14"
        />

        <ul className="grid border-t-2 border-black md:grid-cols-2">
          {siteData.products.families.map((family, idx) => (
            <li key={family.id} className="border-b-2 border-black py-8 md:odd:border-r-2 md:odd:pr-10 md:even:pl-10">
              <span className="font-display text-4xl leading-none text-black">{String(idx + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 font-monument text-xl font-bold uppercase leading-[1.15] text-black sm:text-2xl">{family.name}</h3>
              <p className="mt-3 max-w-[42ch] font-sans text-base leading-[1.6] text-black">{family.desc}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[58ch] border-l-4 border-black pl-5 font-sans text-base font-semibold leading-[1.6] text-black">
            {siteData.products.note}
          </p>
          <button
            type="button"
            onClick={onOpenInquiry}
            aria-haspopup="dialog"
            className="inline-flex min-h-14 shrink-0 items-center justify-center gap-3 bg-black px-8 font-sans text-sm font-bold uppercase tracking-[0.14em] text-tvl-amber transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Ask about a custom system
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};
