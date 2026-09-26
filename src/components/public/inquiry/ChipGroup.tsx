import React from "react";

interface ChipGroupProps {
  legend: string;
  name: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  errorId: string;
  firstFieldId?: string;
}

// Accessible single-choice chips: real radio inputs, styled labels.
export const ChipGroup: React.FC<ChipGroupProps> = ({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  errorId,
  firstFieldId,
}) => (
  <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
    <legend className="inquiry-label">{legend}</legend>
    <div className="mt-3 flex flex-wrap gap-2.5">
      {options.map((option, index) => (
        <label key={option} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            data-field={index === 0 ? firstFieldId : undefined}
            className="peer sr-only"
          />
          <span
            className={`inquiry-chip flex min-h-11 items-center border-2 border-black px-4 py-2 font-sans text-sm font-bold text-black transition-colors peer-checked:bg-[#FBD227] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-black ${
              value === option ? "bg-[#FBD227]" : "bg-white hover:bg-[#FEF6D4]"
            } ${error ? "border-l-[6px] border-l-[#DD7230]" : ""}`}
          >
            {option}
          </span>
        </label>
      ))}
    </div>
    {error && (
      <p id={errorId} className="inquiry-error">
        {error}
      </p>
    )}
  </fieldset>
);
