import { cn } from "@/lib/design-system/cn";
import type { FhisCardProps } from "@/lib/design-system/types";

export function Card({
  variant = "default",
  padding = "md",
  className,
  children,
  ...props
}: FhisCardProps) {
  return (
    <div
      className={cn(
        "fhis-card",
        variant === "elevated" && "fhis-card-elevated",
        variant === "ghost" && "fhis-card-ghost",
        `fhis-card-pad-${padding}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
