import Link from "next/link";
import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface UnavailableStateProps extends FhisClassNameProps {
  toolName: string;
  reason: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function UnavailableState({
  toolName,
  reason,
  ctaHref = "/command-center",
  ctaLabel = "Ir a Command Center",
  className,
}: UnavailableStateProps) {
  return (
    <div className={cn("fhis-empty-state", className)} role="status">
      <span className="fhis-empty-state-icon">◎</span>
      <div className="fhis-empty-state-title">{toolName} no disponible</div>
      <div className="fhis-empty-state-desc">{reason}</div>
      <Link href={ctaHref} className="fhis-btn fhis-btn-primary" style={{ marginTop: 16 }}>
        {ctaLabel}
      </Link>
    </div>
  );
}
