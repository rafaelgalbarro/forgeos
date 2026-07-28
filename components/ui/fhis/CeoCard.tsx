import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

interface CeoCardProps extends FhisClassNameProps, FhisChildrenProps {
  title: string;
  subtitle?: string;
}

export function CeoCard({ title, subtitle, children, className }: CeoCardProps) {
  return (
    <div className={cn("fhis-ceo-card", className)}>
      <div className="fhis-ceo-card-title">{title}</div>
      {subtitle && <div className="fhis-ceo-card-subtitle">{subtitle}</div>}
      <div className="fhis-ceo-card-content">{children}</div>
    </div>
  );
}
