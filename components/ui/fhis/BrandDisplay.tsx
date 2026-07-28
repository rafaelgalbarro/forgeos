import { brand } from "@/lib/design-system";
import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface BrandDisplayProps extends FhisClassNameProps {
  showSystem?: boolean;
}

export function BrandDisplay({ className, showSystem = false }: BrandDisplayProps) {
  return (
    <div className={cn("fhis-brand", className)}>
      <div>
        <div className="fhis-brand-logo">
          {brand.shortName}
          <span>OS</span>
        </div>
        <div className="fhis-brand-tagline">{brand.tagline}</div>
        {showSystem && <div className="fhis-brand-system">{brand.systemFull}</div>}
      </div>
    </div>
  );
}
