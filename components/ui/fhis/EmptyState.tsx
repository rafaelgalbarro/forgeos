import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

interface EmptyStateProps extends FhisClassNameProps, FhisChildrenProps {
  icon?: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon = "◎", title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn("fhis-empty-state", className)}>
      <span className="fhis-empty-state-icon">{icon}</span>
      <div className="fhis-empty-state-title">{title}</div>
      {description && <div className="fhis-empty-state-desc">{description}</div>}
      {children}
    </div>
  );
}
