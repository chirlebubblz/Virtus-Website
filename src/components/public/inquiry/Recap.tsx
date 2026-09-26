import React from "react";

export const Recap: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="mt-5 flex flex-wrap gap-2">
    {items.map((item) => (
      <li key={item} className="border-2 border-white px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white">
        {item}
      </li>
    ))}
  </ul>
);
