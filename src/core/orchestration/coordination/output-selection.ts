/** PROGRAM 6030 — Multi-output selection integration. */

import type { CostEstimate, DurationEstimate } from "../../domain/types";
import type { OutputSelectionDecision, OutputSelectionItem, OutputRequirement } from "../types";
import { createDurationEstimate, createEstimate } from "../policies/cost-estimation";

const DEFAULT_ORDER = [
  "VENTURE",
  "BRAND",
  "WEBSITE",
  "WEB_APP",
  "BACKEND",
  "MOBILE",
  "DEPLOYMENT",
] as const;

export interface SelectOutputsInput {
  missionId: string;
  ideaText: string;
  includeMobile?: boolean;
}

function item(
  kind: string,
  requirement: OutputRequirement,
  order: number,
  parallelWith: string[],
  reason: string,
  cost: number,
  minutes: number,
): OutputSelectionItem {
  const estimatedCost: CostEstimate = createEstimate(cost, "EUR", "multi-output-selector");
  const estimatedDuration: DurationEstimate = createDurationEstimate(
    minutes,
    "min",
    "multi-output-selector",
  );
  return { kind, requirement, order, parallelWith, estimatedCost, estimatedDuration, reason };
}

/** Integrates Multi-Output concepts; generates an approvable decision. */
export function proposeOutputSelection(input: SelectOutputsInput): OutputSelectionDecision {
  const lower = input.ideaText.toLowerCase();
  const wantMobile =
    input.includeMobile === true ||
    /móvil|mobile|app store|expo|ios|android/.test(lower);

  const items: OutputSelectionItem[] = [
    item("VENTURE", "required", 1, [], "DNA / venture package", 1.5, 2),
    item("BRAND", "required", 2, [], "Brand identity", 1.0, 1),
    item("WEBSITE", "required", 3, ["WEB_APP"], "Marketing site", 2.0, 3),
    item("WEB_APP", "required", 4, ["WEBSITE"], "Primary web application", 3.0, 4),
    item(
      "MOBILE",
      wantMobile ? "optional" : "excluded",
      5,
      ["WEB_APP"],
      wantMobile ? "Optional mobile client" : "Excluded by intent",
      wantMobile ? 2.5 : 0,
      wantMobile ? 4 : 0,
    ),
    item("BACKEND", "optional", 6, [], "API/backend blueprint", 2.0, 3),
    item("DEPLOYMENT", "required", 7, [], "Preview deployment only", 1.0, 2),
  ];

  return {
    decisionId: `outsel_${input.missionId}`,
    missionId: input.missionId,
    items,
    status: "proposed",
    explanation:
      "Output selection proposed from intent profile (required/optional/excluded, order, parallelism, cost, time).",
  };
}

export async function proposeOutputSelectionWithMultiOutput(
  input: SelectOutputsInput,
): Promise<OutputSelectionDecision> {
  try {
    const mod = await import("@/lib/multi-output/output-selector");
    const result = mod.selectOutputsByIntent(input.ideaText, "VENTURE", ["APPLICATION"]);

    const items: OutputSelectionItem[] = (result.selections ?? []).map(
      (sel: { kind: string; requirement: OutputRequirement; reason: string }, idx: number) =>
        item(
          sel.kind,
          sel.requirement,
          idx + 1,
          [],
          sel.reason,
          sel.requirement === "excluded" ? 0 : 1.5,
          sel.requirement === "excluded" ? 0 : 2,
        ),
    );

    if (items.length) {
      return {
        decisionId: `outsel_${input.missionId}`,
        missionId: input.missionId,
        items,
        status: "proposed",
        explanation: result.explanation ?? "Selected via lib/multi-output",
      };
    }
  } catch {
    // Fall through to local deterministic selector
  }
  return proposeOutputSelection(input);
}

export function approveOutputSelection(decision: OutputSelectionDecision): OutputSelectionDecision {
  return { ...decision, status: "approved" };
}

export function activeOutputKinds(decision: OutputSelectionDecision): string[] {
  return decision.items
    .filter((i) => i.requirement !== "excluded")
    .sort((a, b) => a.order - b.order)
    .map((i) => i.kind);
}

export { DEFAULT_ORDER };
