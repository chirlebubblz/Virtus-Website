"use client";

import React, { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { SectionHeader } from "./SectionHeader";
import { useLeadForm } from "./useLeadForm";
import { Button, Field, Honeypot, SlantDivider } from "./ui";

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
      className="relative scroll-mt-16 bg-tvl-amber py-16 text-black sm:py-24"
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
          <div role="status" className="self-start rounded-xl border-2 border-black bg-white p-6">
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
            <Field id="lead-name" label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <Field
              id="lead-email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <Field
              id="lead-message"
              label="What are you building? (optional)"
              as="textarea"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              error={errors.message}
            />
            <Honeypot value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            {formError && (
              <p role="alert" className="font-sans text-sm font-bold">
                {formError}
              </p>
            )}
            <Button type="submit" disabled={status === "sending"} tone="black" hoverTone="white" size="lg" icon="arrow-right">
              {status === "sending" ? "Sending" : "Send details"}
            </Button>
          </form>
        )}
      </div>
      <SlantDivider toTone="black" />
    </section>
  );
};
