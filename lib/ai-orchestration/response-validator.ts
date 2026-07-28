/** ForgeOS AI Orchestration — response validators. */

import { extractJSON } from "@/lib/ai-gateway/response-parser";
import type {
  BoardOutput,
  BuildOutput,
  CeoOutput,
  OrchestrationTaskId,
  ValidatedOutput,
} from "./types";

function hasString(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === "string" && (obj[key] as string).trim().length > 0;
}

function hasStringArray(obj: Record<string, unknown>, key: string): boolean {
  return Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0;
}

export function validateCeoOutput(data: Record<string, unknown>): {
  valid: boolean;
  output?: CeoOutput;
  warnings: string[];
} {
  const warnings: string[] = [];
  const required = ["summary", "priority", "recommendation", "expectedImpact"] as const;
  for (const key of required) {
    if (!hasString(data, key)) warnings.push(`Missing or empty CEO field: ${key}`);
  }
  if (!hasStringArray(data, "risks") && !hasString(data, "risks")) {
    warnings.push("Missing CEO risks");
  }

  if (warnings.length > 0) {
    return { valid: false, warnings };
  }

  return {
    valid: true,
    warnings,
    output: {
      summary: String(data.summary),
      executiveSummary: data.executiveSummary ? String(data.executiveSummary) : undefined,
      priority: String(data.priority),
      topPriorities: Array.isArray(data.topPriorities)
        ? (data.topPriorities as unknown[]).map(String)
        : undefined,
      risks: Array.isArray(data.risks) ? data.risks.map(String) : [String(data.risks)],
      criticalRisks: Array.isArray(data.criticalRisks)
        ? (data.criticalRisks as unknown[]).map(String)
        : undefined,
      growthOpportunities: Array.isArray(data.growthOpportunities)
        ? (data.growthOpportunities as unknown[]).map(String)
        : undefined,
      blockedVentures: Array.isArray(data.blockedVentures)
        ? (data.blockedVentures as unknown[]).map(String)
        : undefined,
      recommendation: String(data.recommendation),
      recommendedNextActions: Array.isArray(data.recommendedNextActions)
        ? (data.recommendedNextActions as unknown[]).map(String)
        : undefined,
      expectedImpact: String(data.expectedImpact),
      confidence: typeof data.confidence === "number" ? Number(data.confidence) : undefined,
      timeHorizon: data.timeHorizon ? String(data.timeHorizon) : undefined,
    },
  };
}

export function validateBoardOutput(data: Record<string, unknown>): {
  valid: boolean;
  output?: BoardOutput;
  warnings: string[];
} {
  const warnings: string[] = [];
  const required = ["member", "position", "vote"] as const;
  for (const key of required) {
    if (!hasString(data, key)) warnings.push(`Missing or empty Board field: ${key}`);
  }
  if (!hasStringArray(data, "argumentsFor")) warnings.push("Missing argumentsFor");
  if (!hasStringArray(data, "argumentsAgainst")) warnings.push("Missing argumentsAgainst");
  if (!hasStringArray(data, "risks")) warnings.push("Missing risks");
  if (typeof data.confidence !== "number") warnings.push("Missing confidence number");

  if (warnings.length > 0) {
    return { valid: false, warnings };
  }

  return {
    valid: true,
    warnings,
    output: {
      member: String(data.member),
      position: String(data.position),
      opinion: data.opinion ? String(data.opinion) : String(data.position),
      argumentsFor: (data.argumentsFor as unknown[]).map(String),
      argumentsAgainst: (data.argumentsAgainst as unknown[]).map(String),
      risks: (data.risks as unknown[]).map(String),
      opportunities: Array.isArray(data.opportunities)
        ? (data.opportunities as unknown[]).map(String)
        : undefined,
      vote: String(data.vote),
      confidence: Number(data.confidence),
      suggestedAction: data.suggestedAction ? String(data.suggestedAction) : undefined,
    },
  };
}

export function validateBuildOutput(data: Record<string, unknown>): {
  valid: boolean;
  output?: BuildOutput;
  warnings: string[];
} {
  const warnings: string[] = [];
  const required = ["summary", "architecture"] as const;
  for (const key of required) {
    if (!hasString(data, key)) warnings.push(`Missing or empty Build field: ${key}`);
  }
  for (const key of ["modules", "steps", "risks", "nextActions"] as const) {
    if (!hasStringArray(data, key)) warnings.push(`Missing ${key}`);
  }

  if (warnings.length > 0) {
    return { valid: false, warnings };
  }

  return {
    valid: true,
    warnings,
    output: {
      summary: String(data.summary),
      architecture: String(data.architecture),
      modules: (data.modules as unknown[]).map(String),
      steps: (data.steps as unknown[]).map(String),
      risks: (data.risks as unknown[]).map(String),
      nextActions: (data.nextActions as unknown[]).map(String),
    },
  };
}

export function validateOrchestrationResponse(
  taskId: OrchestrationTaskId,
  raw: string
): { valid: boolean; output?: ValidatedOutput; warnings: string[] } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJSON(raw)) as Record<string, unknown>;
  } catch {
    return { valid: false, warnings: ["Response is not valid JSON"] };
  }

  if (taskId.startsWith("CEO_")) return validateCeoOutput(parsed);
  if (taskId.startsWith("BOARD_")) return validateBoardOutput(parsed);
  if (taskId.startsWith("BUILD_")) return validateBuildOutput(parsed);

  return { valid: true, output: parsed, warnings: [] };
}
