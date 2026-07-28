import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

interface TooltipProps extends FhisClassNameProps, FhisChildrenProps {
  content: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn("fhis-tooltip-wrap", className)}>
      {children}
      <span className="fhis-tooltip" role="tooltip">
        {content}
      </span>
    </span>
  );
}
