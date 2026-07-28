import { cn } from "@/lib/design-system/cn";
import type { FhisButtonProps } from "@/lib/design-system/types";

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: FhisButtonProps) {
  return (
    <button
      className={cn(
        "fhis-btn",
        `fhis-btn-${variant}`,
        `fhis-btn-${size}`,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "…" : children}
    </button>
  );
}
