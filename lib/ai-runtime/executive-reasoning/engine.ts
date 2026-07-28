/** ForgeOS AI Runtime RC6 — Executive Reasoning Engine. */

export interface ReasoningInput {
  question: string;
  context?: string;
  department?: string;
  alternatives?: string[];
  risks?: string[];
}

export interface ExecutiveReasoningResult {
  summary: string;
  recommendation: string;
  alternatives: { option: string; pros: string; cons: string }[];
  risks: { risk: string; severity: "low" | "medium" | "high"; mitigation: string }[];
  consensus: string;
  prioritization: string[];
  confidence: number;
  uncertainty: number;
  /** Internal only — never exposed to user */
  _internalDeliberation?: string;
}

export function runExecutiveReasoning(input: ReasoningInput): ExecutiveReasoningResult {
  const confidence = input.risks && input.risks.length > 2 ? 0.72 : 0.88;
  const uncertainty = 1 - confidence;

  const alternatives = (input.alternatives ?? ["Proceed", "Defer", "Pivot"]).map((opt) => ({
    option: opt,
    pros: `Supports ${input.department ?? "executive"} objectives.`,
    cons: "Requires validation against portfolio constraints.",
  }));

  const risks = (input.risks ?? ["Market timing", "Resource allocation"]).map((r) => ({
    risk: r,
    severity: "medium" as const,
    mitigation: "Monitor via executive mesh telemetry.",
  }));

  return {
    summary: `Executive assessment for: ${input.question.slice(0, 120)}`,
    recommendation: "Proceed with phased execution and weekly review checkpoints.",
    alternatives,
    risks,
    consensus: "Board alignment recommended before major commitments.",
    prioritization: ["Validate assumptions", "Execute MVP scope", "Measure outcomes"],
    confidence,
    uncertainty,
  };
}

/** Sanitize reasoning output — strips internal deliberation before user exposure. */
export function toExecutiveSummary(result: ExecutiveReasoningResult): Omit<ExecutiveReasoningResult, "_internalDeliberation"> {
  const { _internalDeliberation: _, ...safe } = result;
  return safe;
}
