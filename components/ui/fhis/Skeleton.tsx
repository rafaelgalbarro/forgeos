import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface SkeletonProps extends FhisClassNameProps {
  variant?: "text" | "title" | "avatar" | "card";
  width?: string;
  height?: string;
}

export function Skeleton({ variant = "text", width, height, className }: SkeletonProps) {
  return (
    <div
      className={cn("fhis-skeleton", `fhis-skeleton-${variant}`, className)}
      style={{ width, height }}
      aria-hidden
    />
  );
}
