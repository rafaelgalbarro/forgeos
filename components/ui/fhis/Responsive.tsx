"use client";

import { useEffect, useState } from "react";
import { grid } from "@/lib/design-system";
import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps, FhisChildrenProps } from "@/lib/design-system/types";

type Breakpoint = "sm" | "md" | "lg" | "xl";

function parseBp(bp: string): number {
  return parseInt(bp, 10);
}

export function useResponsive() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const bp: Breakpoint =
    width >= parseBp(grid.breakpoints.xl)
      ? "xl"
      : width >= parseBp(grid.breakpoints.lg)
        ? "lg"
        : width >= parseBp(grid.breakpoints.md)
          ? "md"
          : "sm";

  return {
    width,
    bp,
    isSm: width < parseBp(grid.breakpoints.md),
    isMd: width >= parseBp(grid.breakpoints.md) && width < parseBp(grid.breakpoints.lg),
    isLg: width >= parseBp(grid.breakpoints.lg),
  };
}

interface ResponsiveProps extends FhisClassNameProps, FhisChildrenProps {
  hideBelow?: "sm" | "md";
  showBelow?: "sm" | "md";
}

export function Responsive({ hideBelow, showBelow, className, children }: ResponsiveProps) {
  const classes = cn(
    hideBelow === "sm" && "fhis-hide-sm",
    showBelow === "sm" && "fhis-show-sm",
    hideBelow === "md" && "fhis-hide-md",
    showBelow === "md" && "fhis-show-md",
    className
  );
  return <div className={classes}>{children}</div>;
}
