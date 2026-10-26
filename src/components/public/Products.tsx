import React from "react";
import { siteData } from "@/data/siteData";
import { SectionHeader } from "./SectionHeader";
import { Icon } from "@/components/icons/Icon";

interface ProductsProps {
  onOpenInquiry: () => void;
}

export const Products: React.FC<ProductsProps> = ({ onOpenInquiry }) => {
  return (
    <section
      id="products"
      aria-labelledby="products-title"
      className="relative scroll-mt-16 overflow-hidden bg-[#080808] py-16 text-white sm:py-24 lg:py-28"
    >
      {/* Ambient background lighting */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-1/3 -right-24 h-[30rem] w-[30rem] rounded-full bg-[#F5C518]/[0.025] blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[96rem] 2xl:max-w-[104rem] px-5 sm:px-8 lg:px-10 2xl:px-12">
        <SectionHeader
          tone="dark"
          eyebrow={siteData.products.eyebrow}
          title={siteData.products.title}
          titleId="products-title"
          intro={siteData.products.intro}
          className="mb-12 sm:mb-16"
        />

        <ul className="grid gap-6 md:grid-cols-2">
          {siteData.products.families.map((family, idx) => (
            <li key={family.id} className="flex">
              <article className="group relative flex w-full flex-col justify-between rounded-2xl border border-white/10 bg-[#0E0E0E] p-6 sm:p-8 transition-all duration-300 hover:border-[#F5C518]/50 hover:bg-[#121212] hover:shadow-[0_0_35px_rgba(245,197,24,0.06)]">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#F5C518]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F5C518]" />
                      SYS.MOD-0{idx + 1}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wider text-zinc-400">
                      Ready-to-Deploy
                    </span>
                  </div>

                  <h3 className="mt-5 font-monument text-xl sm:text-2xl font-bold uppercase leading-tight text-white transition-colors duration-200 group-hover:text-[#F5C518]">
                    {family.name}
                  </h3>

                  <p className="mt-3 max-w-[48ch] 2xl:max-w-[56ch] font-sans text-sm sm:text-base leading-relaxed text-zinc-400">
                    {family.desc}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5 font-mono text-xs text-zinc-500 transition-colors group-hover:text-zinc-300">
                  <span>MODULAR ARCHITECTURE</span>
                  <Icon
                    name="arrow-right"
                    className="h-3.5 w-3.5 text-[#F5C518] transition-transform duration-200 group-hover:translate-x-1"
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>

        {/* Bottom Context Banner & CTA */}
        <div className="mt-12 flex flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-[#0C0C0C] p-6 sm:p-8 sm:flex-row sm:items-center">
          <div className="max-w-[56ch] 2xl:max-w-[66ch] border-l-2 border-[#F5C518] pl-5">
            <p className="font-sans text-sm font-medium leading-relaxed text-zinc-300 sm:text-base">
              {siteData.products.note}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenInquiry}
            aria-haspopup="dialog"
            className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-lg bg-[#F5C518] px-6 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.14em] text-black shadow-[0_0_20px_rgba(245,197,24,0.2)] transition-all hover:bg-[#ffd026] hover:shadow-[0_0_30px_rgba(245,197,24,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
          >
            <span>Ask about a custom system</span>
            <Icon
              name="arrow-right"
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1"
            />
          </button>
        </div>
      </div>

      {/* Hairline boundary */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F5C518]/20 to-transparent"
      />
    </section>
  );
};
