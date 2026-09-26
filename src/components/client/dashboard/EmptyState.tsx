import React from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { card } from "./styles";

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: React.ReactNode }) {
  return (
    <div className={`${card} flex flex-col items-center px-6 py-14 text-center`}>
      <span className="flex h-16 w-16 items-center justify-center border border-[#FBD227]/40 bg-[#FBD227]/10 text-[#FBD227]">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h3 className="mt-5 font-monument text-lg font-bold uppercase text-white">{title}</h3>
      {children && <p className="mt-2 max-w-[44ch] font-sans text-base leading-relaxed text-[#A3A3A3]">{children}</p>}
    </div>
  );
}
