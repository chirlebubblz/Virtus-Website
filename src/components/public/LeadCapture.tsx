"use client";

import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { SectionHeader } from "./SectionHeader";
import { useLeadForm } from "./useLeadForm";

const fieldClass =
  "mt-2 block min-h-12 w-full border-2 border-black bg-white px-4 font-sans text-base text-black placeholder:text-[#666666] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black";

export const LeadCapture: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const { status, errors, formError, submit } = useLeadForm();

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="scroll-mt-16 bg-tvl-amber py-16 text-black sm:py-24"
    >
      <div className="mx-auto grid w-full max-w-[88rem] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_28rem] lg:gap-20 lg:px-10">
        <SectionHeader
          tone="light"
          eyebrow="Stay in touch"
          title="Tell us what you are building"
          titleId="contact-title"
          intro="Share your email and a line about the project. A studio lead replies within one business day."
        />

        {status === "sent" ? (
          <div role="status" className="self-start border-2 border-black bg-white p-6">
            <p className="flex items-center gap-3 font-sans text-lg font-bold">
              <Icon name="check" className="h-6 w-6" />
              Received. We will be in touch soon.
            </p>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit({ name, email, message }, honeypot);
            }}
            className="space-y-5"
          >
            <div>
              <label htmlFor="lead-name" className="font-sans text-sm font-bold">
                Name
              </label>
              <input
                id="lead-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={errors.name ? true : undefined}
                className={fieldClass}
              />
              {errors.name && <p role="alert" className="mt-1 font-sans text-sm font-semibold">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="lead-email" className="font-sans text-sm font-bold">
                Email
              </label>
              <input
                id="lead-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errors.email ? true : undefined}
                className={fieldClass}
              />
              {errors.email && <p role="alert" className="mt-1 font-sans text-sm font-semibold">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="lead-message" className="font-sans text-sm font-bold">
                What are you building? (optional)
              </label>
              <textarea
                id="lead-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={errors.message ? true : undefined}
                className={fieldClass}
              />
              {errors.message && <p role="alert" className="mt-1 font-sans text-sm font-semibold">{errors.message}</p>}
            </div>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            {formError && (
              <p role="alert" className="font-sans text-sm font-bold">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex min-h-14 items-center gap-3 bg-black px-8 font-sans text-sm font-bold uppercase tracking-[0.16em] text-tvl-amber transition-colors hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-black disabled:opacity-60"
            >
              {status === "sending" ? "Sending" : "Send details"}
              <Icon name="arrow-right" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
