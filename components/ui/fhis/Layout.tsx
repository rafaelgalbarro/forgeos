import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps, FhisSize } from "@/lib/design-system/types";
import type { HTMLAttributes } from "react";

interface StackProps extends HTMLAttributes<HTMLDivElement>, FhisClassNameProps, FhisChildrenProps {
  gap?: FhisSize;
}

export function Stack({ gap = "md", className, children, ...props }: StackProps) {
  const gapClass = gap === "sm" ? "fhis-stack-gap-sm" : gap === "lg" ? "fhis-stack-gap-lg" : "fhis-stack-gap-md";
  return (
    <div className={cn("fhis-stack", gapClass, className)} {...props}>
      {children}
    </div>
  );
}

interface GridProps extends HTMLAttributes<HTMLDivElement>, FhisClassNameProps, FhisChildrenProps {
  cols?: 2 | 3 | 4;
  gap?: FhisSize;
}

export function Grid({ cols = 2, gap = "md", className, children, ...props }: GridProps) {
  const gapClass = gap === "sm" ? "fhis-grid-gap-sm" : gap === "lg" ? "fhis-grid-gap-lg" : "fhis-grid-gap-md";
  return (
    <div className={cn("fhis-grid", `fhis-grid-cols-${cols}`, gapClass, className)} {...props}>
      {children}
    </div>
  );
}

export function Container({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & FhisClassNameProps & FhisChildrenProps) {
  return (
    <div className={cn("fhis-container", className)} {...props}>
      {children}
    </div>
  );
}

export function Panel({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & FhisClassNameProps & FhisChildrenProps) {
  return (
    <div className={cn("fhis-panel", className)} {...props}>
      {children}
    </div>
  );
}
