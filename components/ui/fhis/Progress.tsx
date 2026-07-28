import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface ProgressProps extends FhisClassNameProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

export function Progress({ value, max = 100, label, showValue, className }: ProgressProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("fhis-progress", className)}>
      {(label || showValue) && (
        <div className="fhis-progress-label">
          {label && <span>{label}</span>}
          {showValue && <span>{pct}%</span>}
        </div>
      )}
      <div className="fhis-progress-track">
        <div className="fhis-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
