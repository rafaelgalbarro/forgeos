"use client";

import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface CheckboxProps extends FhisClassNameProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <label className={cn("fhis-checkbox-wrap", className)}>
      <input
        type="checkbox"
        className="fhis-checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="fhis-checkbox-label">{label}</span>
    </label>
  );
}
