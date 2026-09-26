import React from "react";
import { SERVICES, SERVICE_BLURBS, type Service } from "@/lib/inquiryOptions";

interface ChoiceCardsProps {
  value: Service | "";
  onChange: (service: Service) => void;
  error?: string;
  errorId: string;
}

const BARS = ["bg-black", "bg-[#854D27]", "bg-[#DD7230]", "bg-black"];

export const ChoiceCards: React.FC<ChoiceCardsProps> = ({ value, onChange, error, errorId }) => (
  <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
    <legend className="sr-only">What do you need?</legend>
    <div className="grid gap-3 sm:grid-cols-2">
      {SERVICES.map((service, index) => {
        const checked = value === service;
        return (
          <label key={service} className="relative flex cursor-pointer">
            <input
              type="radio"
              name="service"
              value={service}
              checked={checked}
              onChange={() => onChange(service)}
              data-field={index === 0 ? "service" : undefined}
              className="peer sr-only"
            />
            <span
              className={`relative flex w-full flex-col border-2 border-black py-4 pl-7 pr-4 text-black transition-colors peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black ${
                checked ? "bg-[#FBD227]" : "bg-white hover:bg-[#FEF6D4]"
              }`}
            >
              <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-2 ${BARS[index % BARS.length]}`} />
              <span className="flex items-start justify-between gap-3">
                <span className="font-monument text-base font-bold uppercase leading-[1.2]">{service}</span>
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 border-black ${
                    checked ? "bg-black" : "bg-white"
                  }`}
                >
                  {checked && <span className="h-2 w-2 bg-[#FBD227]" />}
                </span>
              </span>
              <span className="mt-2 font-sans text-sm leading-[1.5] text-black">{SERVICE_BLURBS[service]}</span>
            </span>
          </label>
        );
      })}
    </div>
    {error && (
      <p id={errorId} className="inquiry-error">
        {error}
      </p>
    )}
  </fieldset>
);
