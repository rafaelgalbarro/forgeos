"use client";

import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface SwitchProps extends FhisClassNameProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ label, checked, onChange, disabled, className }: SwitchProps) {
  return (
    <div className={cn("fhis-switch-wrap", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cn("fhis-switch", checked && "fhis-switch-on")}
        onClick={() => onChange?.(!checked)}
      >
        <span className="fhis-switch-thumb" />
      </button>
      {label && <span className="fhis-switch-label">{label}</span>}
    </div>
  );
}
