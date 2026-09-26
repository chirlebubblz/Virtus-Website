import React from "react";

/** One width and gutter for header, tabs, content and footer, so their edges always line up. */
export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[74rem] px-5 sm:px-8 lg:px-10 ${className}`}>{children}</div>;
}
