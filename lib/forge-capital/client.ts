/** RC8 — Client-safe Forge Capital snapshot (sync, no AI runtime). */

import {
  buildDemoVentureIntelligenceSnapshot,
  buildVentureIntelligenceSnapshot,
  createDemoVentureInputs,
} from "@/lib/venture-intelligence";
import type { VentureFinancialInputs } from "@/lib/venture-intelligence/types";
import { runHeuristicCapitalDepartments } from "./heuristic-departments";

export interface ForgeCapitalClientSnapshot {
  inputs: VentureFinancialInputs;
  intelligence: ReturnType<typeof buildVentureIntelligenceSnapshot>;
  departments: ReturnType<typeof runHeuristicCapitalDepartments>;
  dryRunOnly: true;
  mode: "heuristic";
}

export function buildForgeCapitalClientSnapshot(
  inputs?: VentureFinancialInputs
): ForgeCapitalClientSnapshot {
  const resolved = inputs ?? createDemoVentureInputs();
  const intelligence = buildVentureIntelligenceSnapshot(resolved);
  const departments = runHeuristicCapitalDepartments(resolved, intelligence);

  return {
    inputs: resolved,
    intelligence,
    departments,
    dryRunOnly: true,
    mode: "heuristic",
  };
}

export function buildDemoForgeCapitalClientSnapshot(): ForgeCapitalClientSnapshot {
  const inputs = createDemoVentureInputs();
  const intelligence = buildDemoVentureIntelligenceSnapshot();
  const departments = runHeuristicCapitalDepartments(inputs, intelligence);
  return {
    inputs,
    intelligence,
    departments,
    dryRunOnly: true,
    mode: "heuristic",
  };
}
