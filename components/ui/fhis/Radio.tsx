"use client";

import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface RadioProps extends FhisClassNameProps {
  label: string;
  name: string;
  value: string;
  checked?: boolean;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function Radio({ label, name, value, checked, onChange, disabled, className }: RadioProps) {
  return (
    <label className={cn("fhis-radio-wrap", className)}>
      <input
        type="radio"
        className="fhis-radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(value)}
      />
      <span className="fhis-radio-label">{label}</span>
    </label>
  );
}
