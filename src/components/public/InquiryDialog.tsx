"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Logo } from "./Logo";
import { ChipGroup } from "./inquiry/ChipGroup";
import { ChoiceCards } from "./inquiry/ChoiceCards";
import { Recap } from "./inquiry/Recap";
import {
  CONTACTS,
  LIMITS,
  SERVICE_QUESTIONS,
  STAGES,
  TIMELINES,
  isService,
  isValidPhone,
  type InquiryField,
  type Service,
} from "@/lib/inquiryOptions";
import { Icon } from "@/components/icons/Icon";

type Step = 1 | 2 | 3;
type Status = "idle" | "pending" | "error" | "success";
type FieldErrors = Partial<Record<InquiryField, string>>;

interface InquiryDialogProps {
  open: boolean;
  presetService?: string;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_TITLES: Record<Step, string> = {
  1: "What do you need?",
  2: "Shape the project.",
  3: "Where do we reach you?",
};

const STEP_INTROS: Record<Step, string> = {
  1: "Pick the one that fits best. You can add more in the conversation.",
  2: "Tap your answers. No typing needed.",
  3: "Last step. We reply by email, or set up a call if you prefer.",
};

const normalizeLink = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const InquiryDialog: React.FC<InquiryDialogProps> = ({ open, presetService, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const previousOverflowRef = useRef<string>("");
  const scrollLockedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const statusId = `${uid}-status`;

  const [step, setStep] = useState<Step>(1);
  const [service, setService] = useState<Service | "">("");
  const [scope, setScope] = useState("");
  const [extra, setExtra] = useState("");
  const [stage, setStage] = useState("");
  const [timeline, setTimeline] = useState("");
  const [contact, setContact] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  const [status, setStatusState] = useState<Status>("idle");
  const [statusText, setStatusText] = useState("");
  const statusRef = useRef<Status>("idle");
  const setStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [recap, setRecap] = useState<string[]>([]);

  const clearError = (key: InquiryField) => setErrors((current) => ({ ...current, [key]: undefined }));

  // Fixing the last flagged field dismisses the "check the highlighted fields" banner.
  useEffect(() => {
    if (statusRef.current === "error" && Object.values(errors).every((value) => !value)) {
      setStatus("idle");
      setStatusText("");
    }
  }, [errors, setStatus]);

  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return;
    document.body.style.overflow = previousOverflowRef.current;
    scrollLockedRef.current = false;
  }, []);

  const resetForm = useCallback(() => {
    setStep(1);
    setService("");
    setScope("");
    setExtra("");
    setStage("");
    setTimeline("");
    setContact("");
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setLink("");
    setMessage("");
    setMoreOpen(false);
    setErrors({});
    setRecap([]);
    setStatus("idle");
    setStatusText("");
  }, [setStatus]);

  // Sync the native dialog with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      triggerRef.current = document.activeElement;
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      scrollLockedRef.current = true;

      // A service card pre-selects its service and skips step 1 (only on an untouched form).
      if (!service && isService(presetService)) {
        setService(presetService);
        setStep(2);
      }
      dialog.showModal();
      headingRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Every close path (Escape, backdrop, button, prop) ends in the native close event.
  const handleNativeClose = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    unlockScroll();

    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();

    if (statusRef.current === "pending") {
      setStatus("idle");
      setStatusText("");
    }
    onCloseRef.current();
  }, [unlockScroll, setStatus]);

  // Safety net: never leave the page scroll-locked if the component unmounts open.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      unlockScroll();
    };
  }, [unlockScroll]);

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    else onCloseRef.current();
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) requestClose();
  };

  const goToStep = (next: Step) => {
    setStep(next);
    setErrors({});
    if (statusRef.current === "error") {
      setStatus("idle");
      setStatusText("");
    }
    // Move focus to the new step heading once it has rendered.
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };

  const selectService = (next: Service) => {
    if (next !== service) {
      setService(next);
      setScope("");
      setExtra("");
    }
    clearError("service");
  };

  const validateStep = (target: Step): FieldErrors => {
    const found: FieldErrors = {};
    if (target === 1) {
      if (!service) found.service = "Choose the service that fits best.";
    } else if (target === 2) {
      if (!scope) found.scope = "Choose one.";
      if (!extra) found.extra = "Choose one.";
      if (!stage) found.stage = "Choose one.";
      if (!timeline) found.timeline = "Choose one.";
    } else {
      if (!name.trim()) found.name = "Enter your name.";
      else if (name.trim().length > LIMITS.name) found.name = "Keep your name under 100 characters.";
      if (!email.trim()) found.email = "Enter your email address.";
      else if (email.trim().length > LIMITS.email || !EMAIL_PATTERN.test(email.trim())) {
        found.email = "Enter a valid email address.";
      }
      if (!contact) found.contact = "Choose one.";
      if (contact === "A call") {
        if (!phone.trim()) found.phone = "Enter a phone number so we can call you.";
        else if (!isValidPhone(phone.trim())) found.phone = "Enter a valid phone number, e.g. +63 917 123 4567.";
      }
      if (company.trim().length > LIMITS.company) found.company = "Keep it under 100 characters.";
      if (message.trim().length > LIMITS.message) found.message = "Keep details under 2,000 characters.";
      if (link.trim()) {
        try {
          const url = new URL(normalizeLink(link));
          if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
          if (normalizeLink(link).length > LIMITS.link) found.link = "Keep the link under 300 characters.";
        } catch {
          found.link = "Enter a valid website or social link.";
        }
      }
    }
    return found;
  };

  const showErrors = (found: FieldErrors) => {
    setErrors(found);
    setStatus("error");
    setStatusText("Please check the highlighted fields.");
    const order: InquiryField[] = ["service", "scope", "extra", "stage", "timeline", "name", "email", "contact", "phone", "company", "link", "message"];
    const first = order.find((key) => found[key]);
    if (first) {
      window.requestAnimationFrame(() =>
        dialogRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus()
      );
    }
    // The moreOpen disclosure must be visible for company/link/message errors.
    if (found.company || found.link || found.message) setMoreOpen(true);
  };

  const submit = async () => {
    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim(),
      service,
      scope,
      extra,
      stage,
      timeline,
      contact,
    };
    if (contact === "A call" && phone.trim()) payload.phone = phone.trim();
    if (company.trim()) payload.company = company.trim();
    if (link.trim()) payload.link = normalizeLink(link);
    if (message.trim()) payload.message = message.trim();

    setErrors({});
    setStatus("pending");
    setStatusText("Sending your inquiry…");

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (requestId !== requestIdRef.current) return;

      const body = data as {
        ok?: boolean;
        inquiryId?: unknown;
        error?: { message?: string; fields?: FieldErrors };
      } | null;

      if (response.status === 201 && body?.ok === true && typeof body.inquiryId === "string") {
        setRecap([service as string, scope, extra, stage, timeline, `Reach me by: ${contact}`]);
        setStatus("success");
        setStatusText("Inquiry sent. We will reply by email.");
        window.requestAnimationFrame(() => headingRef.current?.focus());
        return;
      }

      if (body?.error?.fields) {
        setErrors(body.error.fields);
        const f = body.error.fields;
        // Send the visitor back to the earliest step that owns a rejected field.
        if (f.service) goToStep(1);
        else if (f.scope || f.extra || f.stage || f.timeline) goToStep(2);
      }
      setStatus("error");
      setStatusText(
        body?.error?.message ||
          (response.status >= 500
            ? "We could not send your inquiry. Your details are still here—try again."
            : "Please check the highlighted fields.")
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
      setStatusText("We could not reach the server. Your details are still here—try again.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "pending") return;

    const found = validateStep(step);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }
    if (step < 3) {
      goToStep((step + 1) as Step);
      return;
    }
    void submit();
  };

  const pending = status === "pending";
  const questions = isService(service) ? SERVICE_QUESTIONS[service] : null;
  const success = status === "success";

  const fieldClass = (invalid: boolean) =>
    `inquiry-field w-full border-2 bg-white px-4 py-3 font-sans text-base text-black ${
      invalid ? "border-l-[6px] border-[#DD7230]" : "border-black"
    }`;

  const primaryClass =
    "inquiry-focus inline-flex min-h-12 items-center justify-center gap-3 bg-[#FBD227] px-7 font-sans text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-black hover:text-[#FBD227] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <dialog
      ref={dialogRef}
      className="inquiry-dialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onClose={handleNativeClose}
      onClick={handleBackdropClick}
    >
      <div className="inquiry-panel">
        <div className="flex items-center justify-between gap-4 border-b-4 border-[#FBD227] bg-black px-5 py-3.5 sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <Logo size="sm" showWordmark={false} />
            <span className="text-eyebrow truncate font-sans font-bold uppercase text-white">Start a project</span>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="inquiry-focus-dark flex h-11 w-11 shrink-0 items-center justify-center bg-[#FBD227] text-lg font-bold text-black transition-colors hover:bg-white"
            aria-label="Close inquiry form"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="inquiry-body flex-1 px-5 py-8 sm:px-8 sm:py-10">
            <div className="bg-black p-6 sm:p-8">
              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="font-monument text-2xl font-bold uppercase text-[#FBD227] outline-none"
              >
                Received.
              </h2>
              <p id={descId} className="mt-3 font-sans text-base leading-[1.6] text-white">
                Here&apos;s what we heard. We&apos;ll reply by email.
              </p>
              <Recap items={recap} />
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inquiry-focus-dark min-h-12 border-2 border-white bg-transparent px-6 font-sans text-sm font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
                >
                  Send another inquiry
                </button>
                <button
                  type="button"
                  onClick={requestClose}
                  className="inquiry-focus-dark min-h-12 bg-[#FBD227] px-6 font-sans text-sm font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-white"
                >
                  Close
                </button>
              </div>
            </div>
            <div role="status" aria-live="polite" className="sr-only">
              {statusText}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col" aria-describedby={statusId}>
            <div className="inquiry-body flex-1 px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex items-center gap-4">
                <p className="font-sans text-xs font-bold uppercase tracking-[0.16em] text-black">Step {step} of 3</p>
                <div aria-hidden="true" className="flex flex-1 gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={`h-1.5 flex-1 ${n <= step ? "bg-black" : "bg-[#CCCCCC]"}`} />
                  ))}
                </div>
              </div>

              <h2
                id={titleId}
                ref={headingRef}
                tabIndex={-1}
                className="mt-6 font-monument text-[clamp(1.5rem,4.2vw,2.25rem)] font-bold uppercase leading-[1.15] text-black outline-none"
              >
                {STEP_TITLES[step]}
              </h2>
              <p id={descId} className="mt-3 max-w-[48ch] font-sans text-base leading-[1.6] text-[#333333]">
                {STEP_INTROS[step]}
              </p>

              <div
                id={statusId}
                role="status"
                aria-live="polite"
                className={
                  statusText
                    ? status === "error"
                      ? "mt-5 border-l-[6px] border-[#DD7230] bg-[#F8E3D6] px-4 py-3 font-sans text-sm font-semibold text-black"
                      : "mt-5 border-l-[6px] border-black bg-[#FEF6D4] px-4 py-3 font-sans text-sm font-semibold text-black"
                    : "sr-only"
                }
              >
                {statusText}
              </div>

              <div className="mt-6 space-y-7">
                {step === 1 && (
                  <ChoiceCards
                    value={service}
                    onChange={selectService}
                    error={errors.service}
                    errorId={`${uid}-service-error`}
                  />
                )}

                {step === 2 && questions && (
                  <>
                    <ChipGroup
                      legend={questions.scope.label}
                      name="scope"
                      options={questions.scope.options}
                      value={scope}
                      onChange={(v) => {
                        setScope(v);
                        clearError("scope");
                      }}
                      error={errors.scope}
                      errorId={`${uid}-scope-error`}
                      firstFieldId="scope"
                    />
                    <ChipGroup
                      legend={questions.extra.label}
                      name="extra"
                      options={questions.extra.options}
                      value={extra}
                      onChange={(v) => {
                        setExtra(v);
                        clearError("extra");
                      }}
                      error={errors.extra}
                      errorId={`${uid}-extra-error`}
                      firstFieldId="extra"
                    />
                    <ChipGroup
                      legend="Where are you at?"
                      name="stage"
                      options={STAGES}
                      value={stage}
                      onChange={(v) => {
                        setStage(v);
                        clearError("stage");
                      }}
                      error={errors.stage}
                      errorId={`${uid}-stage-error`}
                      firstFieldId="stage"
                    />
                    <ChipGroup
                      legend="When do you need it?"
                      name="timeline"
                      options={TIMELINES}
                      value={timeline}
                      onChange={(v) => {
                        setTimeline(v);
                        clearError("timeline");
                      }}
                      error={errors.timeline}
                      errorId={`${uid}-timeline-error`}
                      firstFieldId="timeline"
                    />
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <label htmlFor={`${uid}-name`} className="inquiry-label">
                        Name
                      </label>
                      <input
                        id={`${uid}-name`}
                        data-field="name"
                        type="text"
                        name="name"
                        autoComplete="name"
                        required
                        maxLength={LIMITS.name}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          clearError("name");
                        }}
                        aria-invalid={errors.name ? true : undefined}
                        aria-describedby={errors.name ? `${uid}-name-error` : undefined}
                        className={fieldClass(Boolean(errors.name))}
                      />
                      {errors.name && (
                        <p id={`${uid}-name-error`} className="inquiry-error">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`${uid}-email`} className="inquiry-label">
                        Email
                      </label>
                      <input
                        id={`${uid}-email`}
                        data-field="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        required
                        maxLength={LIMITS.email}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearError("email");
                        }}
                        aria-invalid={errors.email ? true : undefined}
                        aria-describedby={errors.email ? `${uid}-email-error` : undefined}
                        className={fieldClass(Boolean(errors.email))}
                      />
                      {errors.email && (
                        <p id={`${uid}-email-error`} className="inquiry-error">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <ChipGroup
                      legend="Best way to reach you"
                      name="contact"
                      options={CONTACTS}
                      value={contact}
                      onChange={(v) => {
                        setContact(v);
                        clearError("contact");
                      }}
                      error={errors.contact}
                      errorId={`${uid}-contact-error`}
                      firstFieldId="contact"
                    />

                    {contact === "A call" && (
                      <div>
                        <label htmlFor={`${uid}-phone`} className="inquiry-label">
                          Phone number
                        </label>
                        <input
                          id={`${uid}-phone`}
                          data-field="phone"
                          type="tel"
                          inputMode="tel"
                          name="phone"
                          autoComplete="tel"
                          required
                          maxLength={LIMITS.phone}
                          placeholder="+63 917 123 4567"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            clearError("phone");
                          }}
                          aria-invalid={errors.phone ? true : undefined}
                          aria-describedby={`${uid}-phone-hint${errors.phone ? ` ${uid}-phone-error` : ""}`}
                          className={`${fieldClass(Boolean(errors.phone))} placeholder:text-[#666666]`}
                        />
                        <p id={`${uid}-phone-hint`} className="mt-2 font-sans text-sm leading-[1.5] text-[#333333]">
                          Include your country code. We only use it to call you about this project.
                        </p>
                        {errors.phone && (
                          <p id={`${uid}-phone-error`} className="inquiry-error">
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="border-t-2 border-black pt-5">
                      <button
                        type="button"
                        onClick={() => setMoreOpen((current) => !current)}
                        aria-expanded={moreOpen}
                        aria-controls={`${uid}-more`}
                        className="inquiry-focus flex min-h-11 w-full items-center justify-between gap-4 font-sans text-sm font-bold uppercase tracking-[0.12em] text-black"
                      >
                        Add more detail (optional)
                        <span aria-hidden="true" className="text-lg">
                          {moreOpen ? "−" : "+"}
                        </span>
                      </button>

                      <div id={`${uid}-more`} hidden={!moreOpen} className="mt-4 space-y-5">
                        <div>
                          <label htmlFor={`${uid}-company`} className="inquiry-label">
                            Company
                          </label>
                          <input
                            id={`${uid}-company`}
                            data-field="company"
                            type="text"
                            name="company"
                            autoComplete="organization"
                            maxLength={LIMITS.company}
                            value={company}
                            onChange={(e) => {
                              setCompany(e.target.value);
                              clearError("company");
                            }}
                            aria-invalid={errors.company ? true : undefined}
                            aria-describedby={errors.company ? `${uid}-company-error` : undefined}
                            className={fieldClass(Boolean(errors.company))}
                          />
                          {errors.company && (
                            <p id={`${uid}-company-error`} className="inquiry-error">
                              {errors.company}
                            </p>
                          )}
                        </div>

                        <div>
                          <label htmlFor={`${uid}-link`} className="inquiry-label">
                            Existing website or social link
                          </label>
                          <input
                            id={`${uid}-link`}
                            data-field="link"
                            type="text"
                            inputMode="url"
                            name="link"
                            autoComplete="url"
                            maxLength={LIMITS.link}
                            placeholder="yourbrand.com"
                            value={link}
                            onChange={(e) => {
                              setLink(e.target.value);
                              clearError("link");
                            }}
                            aria-invalid={errors.link ? true : undefined}
                            aria-describedby={errors.link ? `${uid}-link-error` : undefined}
                            className={`${fieldClass(Boolean(errors.link))} placeholder:text-[#666666]`}
                          />
                          {errors.link && (
                            <p id={`${uid}-link-error`} className="inquiry-error">
                              {errors.link}
                            </p>
                          )}
                        </div>

                        <div>
                          <label htmlFor={`${uid}-message`} className="inquiry-label">
                            Project notes
                          </label>
                          <textarea
                            id={`${uid}-message`}
                            data-field="message"
                            name="message"
                            rows={4}
                            maxLength={LIMITS.message}
                            value={message}
                            onChange={(e) => {
                              setMessage(e.target.value);
                              clearError("message");
                            }}
                            aria-invalid={errors.message ? true : undefined}
                            aria-describedby={errors.message ? `${uid}-message-error` : undefined}
                            className={`${fieldClass(Boolean(errors.message))} resize-y leading-[1.6]`}
                          />
                          {errors.message && (
                            <p id={`${uid}-message-error`} className="inquiry-error">
                              {errors.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t-2 border-black bg-white px-5 py-4 sm:px-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => goToStep((step - 1) as Step)}
                  disabled={pending}
                  className="inquiry-focus min-h-12 border-2 border-black bg-white px-5 font-sans text-sm font-bold uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white disabled:opacity-60"
                >
                  <span aria-hidden="true">← </span>Back
                </button>
              ) : (
                <span />
              )}
              <button type="submit" disabled={pending} aria-disabled={pending} className={primaryClass}>
                {step < 3 ? "Continue" : pending ? "Sending…" : "Send inquiry"}
                {step < 3 && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
};
