import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

interface BadgeProps extends FhisClassNameProps, FhisChildrenProps {
  variant?: "default" | "accent" | "blue" | "amber" | "red";
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span className={cn("fhis-badge", `fhis-badge-${variant}`, className)}>{children}</span>
  );
}
