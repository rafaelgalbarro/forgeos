/** RC8 — Forge Capital orchestrator — composes venture-intelligence engines. */

import {
  buildVentureIntelligenceSnapshot,
  buildDemoVentureIntelligenceSnapshot,
  createDemoVentureInputs,
} from "@/lib/venture-intelligence";
import type {
  CapitalAiDepartmentResult,
  VentureFinancialInputs,
  VentureIntelligenceSnapshot,
} from "@/lib/venture-intelligence/types";
import { runAllCapitalAiDepartments } from "./ai-departments";

export interface ForgeCapitalSnapshot {
  inputs: VentureFinancialInputs;
  intelligence: VentureIntelligenceSnapshot;
  departments: CapitalAiDepartmentResult[];
  dryRunOnly: true;
  mode: "heuristic" | "mixed";
}

export async function buildForgeCapitalSnapshot(
  inputs?: VentureFinancialInputs
): Promise<ForgeCapitalSnapshot> {
  const resolved = inputs ?? createDemoVentureInputs();
  const intelligence = buildVentureIntelligenceSnapshot(resolved);
  const departments = await runAllCapitalAiDepartments(resolved, intelligence);
  const hasRealAi = departments.some((d) => d.mode === "real-ai");

  return {
    inputs: resolved,
    intelligence,
    departments,
    dryRunOnly: true,
    mode: hasRealAi ? "mixed" : "heuristic",
  };
}

export async function buildDemoForgeCapitalSnapshot(): Promise<ForgeCapitalSnapshot> {
  const inputs = createDemoVentureInputs();
  const intelligence = buildDemoVentureIntelligenceSnapshot();
  const departments = await runAllCapitalAiDepartments(inputs, intelligence);
  return {
    inputs,
    intelligence,
    departments,
    dryRunOnly: true,
    mode: departments.some((d) => d.mode === "real-ai") ? "mixed" : "heuristic",
  };
}

export type { ForgeCapitalClientSnapshot } from "./client";
export {
  buildForgeCapitalClientSnapshot,
  buildDemoForgeCapitalClientSnapshot,
} from "./client";
export { runHeuristicCapitalDepartments } from "./heuristic-departments";
