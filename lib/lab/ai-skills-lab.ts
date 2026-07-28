/** ForgeOS AI Capability Skills Lab — RC4.7. */

import {
  getSkillAuditLogs,
  getSkillTelemetry,
  getSkillHistory,
} from "@/lib/skills";
import { runGovernedSkillRequest } from "@/lib/skills-governance/pipeline";
import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import { evaluateAllPolicies } from "@/lib/skills-governance/policy-engine";
import { getGovernanceHistory } from "@/lib/skills-governance/governance-history";
import type { GovernanceResult } from "@/lib/skills-governance/types";
import {
  AI_CAPABILITY_MODULES,
  AI_SKILL_IDS,
  AI_SKILL_REGISTRY,
} from "@/lib/skills/ai/registry";
import type { AICapabilityAction, AICapabilityDomain } from "@/lib/skills/ai/types";
import type { SkillDefinition, SkillRoutingDecision } from "@/lib/skills/types";

export interface AICapabilitySection {
  domain: AICapabilityDomain;
  skill: SkillDefinition;
  actions: AICapabilityAction[];
  riskSample: { action: string; level: string; score: number };
  policySample: ReturnType<typeof evaluateAllPolicies>;
  runtimeRouting: {
    runtimeSessionId: string;
    aiRuntimeProvider?: string;
    aiRuntimeModel?: string;
  } | null;
}

export interface AISkillsLabSnapshot {
  registry: typeof AI_SKILL_REGISTRY;
  domains: AICapabilitySection[];
  health: { total: number; healthy: number; sandbox: number };
  auditLogs: ReturnType<typeof getSkillAuditLogs>;
  telemetry: ReturnType<typeof getSkillTelemetry>;
  history: ReturnType<typeof getSkillHistory>;
  governanceHistory: ReturnType<typeof getGovernanceHistory>;
  sampleExecutions: Record<string, GovernanceResult | null>;
}

const SAMPLE_ACTIONS: Record<string, string> = {
  "ai-reasoning": "plan",
  "ai-coding": "generate",
  "ai-vision": "analyze_image",
  "ai-voice": "speech_to_text",
  "ai-translation": "translate",
  "ai-search": "semantic_search",
  "ai-memory": "summarize_context",
  "ai-ocr": "extract_text",
  "ai-embeddings": "generate",
  "ai-rag": "retrieve",
  "ai-images": "generate",
  "ai-video": "summarize",
  "ai-audio": "transcribe",
};

const DOMAIN_LABELS: Record<AICapabilityDomain, string> = {
  reasoning: "Reasoning",
  coding: "Coding",
  vision: "Vision",
  voice: "Voice",
  translation: "Translation",
  search: "Search",
  memory: "Memory",
  ocr: "OCR",
  embeddings: "Embeddings",
  rag: "RAG",
  images: "Images",
  video: "Video",
  audio: "Audio",
};

export { DOMAIN_LABELS };

async function runSample(skillId: string, action: string, ventureId: string) {
  try {
    return await runGovernedSkillRequest({
      skillId,
      context: {
        ventureId,
        requestedBy: "cto",
        approvedBy: "ceo",
        action,
        payload: { sandbox: true },
      },
    });
  } catch {
    return null;
  }
}

async function runRuntimeSample(
  mod: (typeof AI_CAPABILITY_MODULES)[number],
  action: string,
  ventureId: string
) {
  const routing: SkillRoutingDecision = {
    skillId: mod.config.id,
    provider: "ai-runtime",
    policy: "ai_usage",
    timeoutMs: 45_000,
    auditLevel: "full",
    rationale: "AI capability routed via AI Runtime (sandbox)",
  };
  const context = {
    ventureId,
    requestedBy: "cto" as const,
    action,
    payload: { sandbox: true },
  };
  try {
    const result = await mod.routeViaAdapter({
      ventureId,
      executionId: `lab-${Date.now()}`,
      action,
      context,
      routing,
    });
    return {
      runtimeSessionId: result.runtimeSessionId,
      aiRuntimeProvider: result.aiRuntime?.provider,
      aiRuntimeModel: result.aiRuntime?.model,
    };
  } catch {
    return null;
  }
}

export async function runAISkillsLab(
  ventureId = "demo-venture-vandl"
): Promise<AISkillsLabSnapshot> {
  const domains: AICapabilitySection[] = await Promise.all(
    AI_CAPABILITY_MODULES.map(async (mod) => {
      const skill = mod.registry;
      const actions = mod.config.actions;
      const sampleAction = SAMPLE_ACTIONS[skill.id] ?? actions[0]?.id ?? "analyze";
      const risk = assessSkillRisk(skill.id, sampleAction);
      const policySample = evaluateAllPolicies(skill.id, sampleAction, "sandbox");
      const runtimeRouting = await runRuntimeSample(mod, sampleAction, ventureId);
      return {
        domain: mod.config.domain,
        skill,
        actions,
        riskSample: { action: sampleAction, level: risk.level, score: risk.score },
        policySample,
        runtimeRouting,
      };
    })
  );

  const sampleExecutions: Record<string, GovernanceResult | null> = {};
  for (const skillId of AI_SKILL_IDS) {
    const action = SAMPLE_ACTIONS[skillId] ?? "analyze";
    sampleExecutions[skillId] = await runSample(skillId, action, ventureId);
  }

  const healthy = AI_SKILL_REGISTRY.filter((s) => s.health === "healthy").length;
  const sandbox = AI_SKILL_REGISTRY.filter((s) => s.status === "sandbox").length;

  return {
    registry: AI_SKILL_REGISTRY,
    domains,
    health: { total: AI_SKILL_REGISTRY.length, healthy, sandbox },
    auditLogs: getSkillAuditLogs(ventureId).filter((l) => AI_SKILL_IDS.has(l.skillId)),
    telemetry: getSkillTelemetry().filter((t) => AI_SKILL_IDS.has(t.skillId)),
    history: getSkillHistory(ventureId).filter((h) => AI_SKILL_IDS.has(h.skillId)),
    governanceHistory: getGovernanceHistory(ventureId).filter((h) =>
      AI_SKILL_IDS.has(h.skillId)
    ),
    sampleExecutions,
  };
}
