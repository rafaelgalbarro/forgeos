import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

interface PageTemplateProps extends FhisClassNameProps, FhisChildrenProps {
  title: string;
  subtitle?: string;
}

export function PageTemplate({ title, subtitle, children, className }: PageTemplateProps) {
  return (
    <div className={cn("fhis-page", className)}>
      <header className="fhis-page-header">
        <h1 className="fhis-page-title">{title}</h1>
        {subtitle && <p className="fhis-page-subtitle">{subtitle}</p>}
      </header>
      <div className="fhis-page-body">{children}</div>
    </div>
  );
}
