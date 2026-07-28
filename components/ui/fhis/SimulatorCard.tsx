import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface SimulatorCardProps extends FhisClassNameProps {
  title: string;
  value: string | number;
  delta?: number;
}

export function SimulatorCard({ title, value, delta, className }: SimulatorCardProps) {
  return (
    <div className={cn("fhis-simulator-card", className)}>
      <div className="fhis-simulator-card-header">
        <span className="fhis-simulator-card-title">{title}</span>
        {delta !== undefined && (
          <span
            className={cn(
              "fhis-simulator-card-delta",
              delta >= 0 ? "fhis-simulator-card-delta-up" : "fhis-simulator-card-delta-down"
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
      </div>
      <div className="fhis-simulator-card-value">{value}</div>
    </div>
  );
}
