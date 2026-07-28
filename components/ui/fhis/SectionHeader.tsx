import type { ReactNode } from "react";
import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface SectionHeaderProps extends FhisClassNameProps {
  title: string;
  description?: string;
  /** Alias for description — used across venture workspace sections */
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, description, subtitle, action, className }: SectionHeaderProps) {
  const desc = description ?? subtitle;
  return (
    <header className={cn("fhis-section-header", className)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--fhis-space-3)", flexWrap: "wrap" }}>
        <div>
          <h2 className="fhis-section-header-title">{title}</h2>
          {desc && <p className="fhis-section-header-desc">{desc}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}
