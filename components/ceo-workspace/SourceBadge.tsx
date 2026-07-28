"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CeoWorkspaceSource } from "@/lib/ceo-workspace";

const LABELS: Record<CeoWorkspaceSource, string> = {
  ai: "AI Generated",
  heuristic: "Heuristic",
  mock: "Mock",
};

const VARIANTS: Record<CeoWorkspaceSource, "accent" | "blue" | "amber"> = {
  ai: "accent",
  heuristic: "blue",
  mock: "amber",
};

export function SourceBadge({ source }: { source: CeoWorkspaceSource }) {
  return <Badge variant={VARIANTS[source]}>{LABELS[source]}</Badge>;
}
