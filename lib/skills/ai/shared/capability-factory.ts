/** ForgeOS AI Capability Skills — module factory (RC4.7). */

import { completeViaAIRuntime } from "@/lib/ai-runtime/pipeline";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import { dispatchSkillToRuntime } from "@/lib/skills/adapters/runtime-adapter";
import type { SkillContext, SkillDefinition, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import type { RiskLevel, RollbackPlan, SandboxMode } from "@/lib/skills-governance/types";
import type {
  AICapabilityAuditShape,
  AICapabilityConfig,
  AICapabilityModule,
  AICapabilityPermissions,
  AICapabilityPolicies,
  AICapabilityRiskAssessment,
  AICapabilitySandboxConfig,
  AICapabilityTelemetryMeta,
} from "../types";

const DEFAULT_DEPARTMENTS: MeshDepartmentId[] = [
  "ceo",
  "cto",
  "cpo",
  "research",
  "product",
  "analytics",
];

const RISK_SCORE: Record<RiskLevel, number> = {
  LOW: 20,
  MEDIUM: 45,
  HIGH: 70,
  CRITICAL: 90,
};

function riskToSandbox(level: RiskLevel): SandboxMode {
  if (level === "CRITICAL" || level === "HIGH") return "sandbox";
  if (level === "MEDIUM") return "dry_run";
  return "simulation";
}

export function buildRegistry(config: AICapabilityConfig): SkillDefinition {
  return {
    id: config.id,
    name: config.name,
    category: "ai",
    version: "1.0.0",
    provider: "ai-runtime",
    requiredCredentials: [],
    estimatedCostPerCall: 0.02,
    estimatedLatencyMs: 1800,
    permissions: [`${config.id}:execute`, ...config.actions.map((a) => `${config.id}:${a.id}`)],
    risks: [...config.risks, "ai_cost"],
    capability: config.capability,
    status: "sandbox",
    health: "healthy",
  };
}

export function buildPermissions(config: AICapabilityConfig): AICapabilityPermissions {
  return {
    skillId: config.id,
    defaultScopes: [`${config.id}:execute`, "ai:capability:read"],
    actionScopes: Object.fromEntries(
      config.actions.map((a) => [a.id, [`${config.id}:${a.id}`, `ai:${config.domain}:${a.id}`]])
    ),
    allowedDepartments: DEFAULT_DEPARTMENTS,
  };
}

export function buildPolicies(config: AICapabilityConfig): AICapabilityPolicies {
  return {
    skillId: config.id,
    aiUsagePolicy: "ai_usage",
    constraints: {
      id: `policy-ai-${config.domain}`,
      maxCostPerCall: 0.15,
      timeoutMs: 45_000,
      requireApproval: config.actions.some((a) => a.risk === "HIGH" || a.risk === "CRITICAL"),
      allowedDepartments: DEFAULT_DEPARTMENTS,
      sandboxOnly: true,
    },
    actionConstraints: Object.fromEntries(
      config.actions.map((a) => [
        a.id,
        a.risk === "HIGH" || a.risk === "CRITICAL"
          ? ["require-approval", "sandbox-only", "ai_usage"]
          : ["sandbox-only", "ai_usage"],
      ])
    ),
  };
}

export function assessActionRisk(
  config: AICapabilityConfig,
  action: string
): AICapabilityRiskAssessment {
  const matched = config.actions.find((a) => a.id === action);
  const level = matched?.risk ?? "MEDIUM";
  const factors = [
    `AI capability: ${config.domain}`,
    `Action: ${action}`,
    "Routed via AI Runtime (no direct vendor API)",
  ];
  if (config.risks.includes("data_exposure")) factors.push("Potential data exposure");
  if (config.risks.includes("content_generation")) factors.push("Generative content");
  return {
    action,
    level,
    score: RISK_SCORE[level],
    factors,
    sandboxMode: riskToSandbox(level),
  };
}

export function buildRollbackPlan(config: AICapabilityConfig, action: string): RollbackPlan {
  const generative = /generate|edit|create|synthesize/i.test(action);
  return {
    skillId: config.id,
    steps: [
      `Discard AI ${config.domain} output for ${action}`,
      "Clear ephemeral context from sandbox memory",
      "Mark audit outcome as rolled_back",
      "Notify requesting department",
    ],
    recoveryPlan: [
      "Re-run in simulation mode",
      "Review ai_usage policy constraints",
      "Escalate to CEO on repeated failure",
    ],
    compensationActions: generative
      ? ["Revoke generated artifact references (mock)", "Purge draft outputs from sandbox"]
      : ["No persistent state — rollback is no-op (mock)"],
  };
}

export function buildTelemetryMeta(config: AICapabilityConfig): AICapabilityTelemetryMeta {
  return {
    skillId: config.id,
    domain: config.domain,
    provider: "ai-runtime",
    metrics: ["latencyMs", "costEstimate", "success", "action", "sandboxMode", "runtimeSessionId"],
    sampleLatencyMs: 1800,
  };
}

export function buildAuditEvent(
  config: AICapabilityConfig,
  params: {
    action: string;
    ventureId: string;
    requestedBy: string;
    outcome: AICapabilityAuditShape["outcome"];
    runtimeSessionId?: string;
    details: string;
  }
): AICapabilityAuditShape {
  return {
    eventType: "AI_CAPABILITY_EXECUTION",
    skillId: config.id,
    domain: config.domain,
    action: params.action,
    ventureId: params.ventureId,
    requestedBy: params.requestedBy,
    outcome: params.outcome,
    sandbox: true,
    routedVia: "ai-runtime",
    runtimeSessionId: params.runtimeSessionId,
    timestamp: new Date().toISOString(),
    details: params.details,
  };
}

export function buildSandboxConfig(config: AICapabilityConfig): AICapabilitySandboxConfig {
  return {
    skillId: config.id,
    defaultMode: "sandbox",
    allowProduction: false,
    networkAccess: false,
    realApiCalls: false,
    aiRuntimeOnly: true,
  };
}

function domainMockData(
  config: AICapabilityConfig,
  action: string,
  context: SkillContext
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    skillId: config.id,
    domain: config.domain,
    action,
    sandbox: true,
    ventureId: context.ventureId,
    requestedBy: context.requestedBy,
    capability: config.capability,
    timestamp: new Date().toISOString(),
  };

  switch (config.domain) {
    case "reasoning":
      return {
        ...base,
        chainOfThought: ["Analyze context", "Identify constraints", "Formulate plan"],
        confidence: 0.88,
        planSteps: ["Step 1: Gather inputs", "Step 2: Evaluate options", "Step 3: Recommend action"],
      };
    case "coding":
      return {
        ...base,
        language: context.payload?.language ?? "typescript",
        linesGenerated: 42,
        suggestions: ["Add error handling", "Extract helper function"],
        reviewScore: 0.91,
      };
    case "vision":
      return {
        ...base,
        objects: [{ label: "document", confidence: 0.94 }, { label: "person", confidence: 0.87 }],
        sceneDescription: "Office workspace with laptop and whiteboard",
        dimensions: { width: 1920, height: 1080 },
      };
    case "voice":
      return {
        ...base,
        transcript: "[MOCK] Hello, schedule a meeting for tomorrow at 10am",
        durationMs: 3200,
        language: "en-US",
        audioFormat: "wav",
      };
    case "translation":
      return {
        ...base,
        sourceLanguage: "en",
        targetLanguage: context.payload?.targetLanguage ?? "es",
        translatedText: "[MOCK] Texto traducido para demostración",
        detectedLanguage: "en",
      };
    case "search":
      return {
        ...base,
        results: [
          { id: "doc-1", title: "Product roadmap Q3", score: 0.92 },
          { id: "doc-2", title: "Architecture overview", score: 0.85 },
        ],
        query: context.payload?.query ?? "product strategy",
        totalHits: 2,
      };
    case "memory":
      return {
        ...base,
        memoryId: `mem-${Date.now()}`,
        summary: "Key venture context: RC4.7 AI capabilities in sandbox mode",
        tokensStored: 256,
      };
    case "ocr":
      return {
        ...base,
        extractedText: "Invoice #12345\nTotal: $1,250.00\nDue: 2026-08-01",
        pages: 1,
        confidence: 0.96,
      };
    case "embeddings":
      return {
        ...base,
        dimensions: 1536,
        vectorPreview: [0.12, -0.34, 0.56, 0.78],
        similarity: 0.89,
        indexId: `idx-${config.id}`,
      };
    case "rag":
      return {
        ...base,
        retrievedChunks: 3,
        augmentedPrompt: "[MOCK] Context-augmented prompt with 3 knowledge chunks",
        sources: ["kb-001", "kb-002", "kb-003"],
      };
    case "images":
      return {
        ...base,
        imageUrl: "mock://sandbox/generated-image.png",
        width: 1024,
        height: 1024,
        style: context.payload?.style ?? "realistic",
      };
    case "video":
      return {
        ...base,
        durationSec: 120,
        summary: "Product demo walkthrough covering features and onboarding",
        keyFrames: 8,
        clipUrl: "mock://sandbox/clip.mp4",
      };
    case "audio":
      return {
        ...base,
        transcript: "[MOCK] Audio analysis: positive sentiment, clear speech",
        durationMs: 45000,
        sentiment: "positive",
        audioUrl: "mock://sandbox/audio.wav",
      };
    default:
      return base;
  }
}

export function buildMockExecutor(config: AICapabilityConfig) {
  return (
    action: string,
    context: SkillContext,
    routing: SkillRoutingDecision
  ): SkillMockResult => {
    const actionDef = config.actions.find((a) => a.id === action);
    const label = actionDef?.name ?? action;
    const data = domainMockData(config, action, context);
    return {
      success: true,
      output: `[MOCK/AI-RUNTIME] ${config.name}.${label} for venture ${context.ventureId} via ${routing.provider}`,
      data,
      mock: true,
    };
  };
}

export function buildAdapter(
  config: AICapabilityConfig,
  executeMock: ReturnType<typeof buildMockExecutor>
) {
  return async (params: {
    ventureId: string;
    executionId: string;
    action: string;
    context: SkillContext;
    routing: SkillRoutingDecision;
  }) => {
    const runtime = dispatchSkillToRuntime({
      skillId: config.id,
      ventureId: params.ventureId,
      executionId: params.executionId,
      action: params.action,
    });

    const aiRuntime = await completeViaAIRuntime({
      task: config.runtimeTask,
      system: `ForgeOS AI Capability: ${config.name} (${config.domain}). Action: ${params.action}. Sandbox only — no direct vendor API.`,
      user: JSON.stringify({
        action: params.action,
        payload: params.context.payload ?? {},
        ventureId: params.ventureId,
      }),
      ventureId: params.ventureId,
      context: {
        ventureId: params.ventureId,
        sources: ["memory", "knowledge", "decision-graph"],
        metadata: { capability: config.capability, domain: config.domain },
      },
    });

    const mock = executeMock(params.action, params.context, params.routing);
    if (mock) {
      mock.data = {
        ...(mock.data ?? {}),
        aiRuntimeOutput: aiRuntime?.output?.slice(0, 200) ?? "",
        aiRuntimeProvider: aiRuntime?.provider ?? "mock",
        aiRuntimeModel: aiRuntime?.model ?? "mock",
        aiRuntimeTelemetryId: aiRuntime?.telemetryId ?? "",
      };
      mock.output = `${mock.output}\n[AI Runtime] ${(aiRuntime?.output ?? "").slice(0, 120)}…`;
    }

    return {
      runtimeSessionId: runtime.runtimeSessionId,
      mock,
      aiRuntime,
    };
  };
}

export function createAICapabilityModule(config: AICapabilityConfig): AICapabilityModule {
  const executeMock = buildMockExecutor(config);
  return {
    config,
    registry: buildRegistry(config),
    permissions: buildPermissions(config),
    policies: buildPolicies(config),
    assessActionRisk: (action) => assessActionRisk(config, action),
    buildRollbackPlan: (action) => buildRollbackPlan(config, action),
    telemetryMeta: buildTelemetryMeta(config),
    buildAuditEvent: (params) => buildAuditEvent(config, params),
    executeMock,
    sandbox: buildSandboxConfig(config),
    routeViaAdapter: buildAdapter(config, executeMock),
  };
}
