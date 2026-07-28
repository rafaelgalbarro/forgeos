import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface LoadingStateProps extends FhisClassNameProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = "Cargando…",
  description,
  className,
}: LoadingStateProps) {
  return (
    <div className={cn("fhis-empty-state", className)} role="status" aria-live="polite">
      <span className="fhis-empty-state-icon fhis-vpc-pulse">◎</span>
      <div className="fhis-empty-state-title">{title}</div>
      {description && <div className="fhis-empty-state-desc">{description}</div>}
    </div>
  );
}
