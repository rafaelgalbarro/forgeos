import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface KpiBlockProps extends FhisClassNameProps {
  label: string;
  value: string | number;
  delta?: number;
}

export function KpiBlock({ label, value, delta, className }: KpiBlockProps) {
  return (
    <div className={cn("fhis-kpi-block", className)}>
      <span className="fhis-kpi-label">{label}</span>
      <span className="fhis-kpi-value">{value}</span>
      {delta !== undefined && (
        <span
          className={cn(
            "fhis-kpi-delta",
            delta >= 0 ? "fhis-kpi-delta-up" : "fhis-kpi-delta-down"
          )}
        >
          {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
        </span>
      )}
    </div>
  );
}
