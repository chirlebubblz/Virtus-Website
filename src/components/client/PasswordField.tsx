"use client";

import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  describedBy?: string;
  invalid?: boolean;
}

/** Password input with a show/hide toggle, styled for the black auth screens. */
export function PasswordField({ id, label, value, onChange, autoComplete, describedBy, invalid }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-sans text-eyebrow font-bold uppercase">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          className="w-full border-2 border-[#333333] bg-black py-3 pl-4 pr-12 font-sans text-base text-white placeholder-[#999999] focus:border-[#FBD227] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#999999] transition-colors hover:text-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[#FBD227]"
        >
          <Icon name={visible ? "eye-off" : "eye"} className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
