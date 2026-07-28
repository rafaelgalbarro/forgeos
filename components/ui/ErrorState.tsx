import type { ReactNode } from "react";
import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface ErrorStateProps extends FhisClassNameProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function ErrorState({
  title = "No se pudo cargar",
  description = "Ha ocurrido un error al cargar esta vista. Intenta de nuevo.",
  children,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("fhis-empty-state", className)} role="alert">
      <span className="fhis-empty-state-icon">⚠</span>
      <div className="fhis-empty-state-title">{title}</div>
      {description && <div className="fhis-empty-state-desc">{description}</div>}
      {children}
    </div>
  );
}
