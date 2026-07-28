import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

export function TokenColors({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-colors", className)}>{children}</div>;
}

export function TokenTypography({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-typography", className)}>{children}</div>;
}

export function TokenGrid({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-grid", className)}>{children}</div>;
}

export function TokenSpacing({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-spacing", className)}>{children}</div>;
}

export function TokenRadius({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-radius", className)}>{children}</div>;
}

export function TokenElevation({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-elevation", className)}>{children}</div>;
}

export function TokenShadows({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-shadows", className)}>{children}</div>;
}

export function TokenBlur({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-blur", className)}>{children}</div>;
}

export function TokenGlow({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-glow", className)}>{children}</div>;
}

export function TokenMotion({ className, children }: FhisClassNameProps & FhisChildrenProps) {
  return <div className={cn("fhis-token-motion", className)}>{children}</div>;
}
