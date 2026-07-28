/** RC8 — Forge Capital lab harness. */

import { buildDemoForgeCapitalClientSnapshot } from "@/lib/forge-capital/client";
import type { ForgeCapitalClientSnapshot } from "@/lib/forge-capital/client";

export interface ForgeCapitalLabSnapshot {
  departmentCount: number;
  departments: string[];
  capital: ForgeCapitalClientSnapshot;
  dryRunOnly: true;
}

const DEPARTMENTS = [
  "Investment AI",
  "Finance AI",
  "Growth AI",
  "Capital AI",
  "Board Advisor AI",
  "Market Intelligence AI",
];

export function runForgeCapitalLab(): ForgeCapitalLabSnapshot {
  const capital = buildDemoForgeCapitalClientSnapshot();

  return {
    departmentCount: DEPARTMENTS.length,
    departments: DEPARTMENTS,
    capital,
    dryRunOnly: true,
  };
}
