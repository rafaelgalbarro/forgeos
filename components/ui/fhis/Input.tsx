import { cn } from "@/lib/design-system/cn";
import type { FhisInputProps } from "@/lib/design-system/types";

export function Input({ label, hint, error, className, id, ...props }: FhisInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={cn("fhis-input-wrap", className)}>
      {label && (
        <label className="fhis-input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn("fhis-input", error && "fhis-input-error-state")}
        {...props}
      />
      {error && <span className="fhis-input-error">{error}</span>}
      {hint && !error && <span className="fhis-input-hint">{hint}</span>}
    </div>
  );
}
