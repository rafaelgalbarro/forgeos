import { getCapabilityById } from "@/lib/capabilities/capability-registry";
import { runAIRuntime } from "@/lib/ai-runtime";
import type {
  CEOAuditRecord,
  CEOBrief,
  CEODecisionType,
  CEOMode,
  CEOReadSources,
  CEORecommendation,
  CEORoutingRecord,
} from "../../domain/venture-ceo";
import { canExecuteInMode, getCEOApprovalGate } from "./policy-engine";

type CEOState = {
  mode: CEOMode;
  briefs: Map<string, CEOBrief>;
  recommendations: Map<string, CEORecommendation[]>;
  audit: CEOAuditRecord[];
  routing: CEORoutingRecord[];
};

const state: CEOState = {
  mode: "ADVISORY",
  briefs: new Map(),
  recommendations: new Map(),
  audit: [],
  routing: [],
};

function now() {
  return new Date().toISOString();
}

function hashInput(sources: CEOReadSources): string {
  return JSON.stringify({
    summary: sources.portfolio.summary,
    risks: sources.risks.length,
    blockers: sources.blockers.length,
    approvals: sources.approvals.map((a) => `${a.id}:${a.status}`).join("|"),
    activityHead: sources.activity.slice(0, 10).map((a) => `${a.id}:${a.at}`).join("|"),
  });
}

function addAudit(type: CEOAuditRecord["type"], detail: string, recommendationId?: string): void {
  state.audit.push({
    id: `ceo-audit-${Date.now()}-${state.audit.length + 1}`,
    type,
    at: now(),
    recommendationId,
    mode: state.mode,
    detail,
  });
}

function approvalRequired(decisionType: CEODecisionType): boolean {
  return getCEOApprovalGate(decisionType).requiresApproval;
}

function buildRecommendation(input: Omit<CEORecommendation, "id" | "createdAt" | "status" | "requiredApproval">): CEORecommendation {
  return {
    ...input,
    id: `ceo-rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now(),
    status: "PENDING_APPROVAL",
    requiredApproval: approvalRequired(input.decisionType),
  };
}

export async function generateCEORecommendations(
  portfolioId: string,
  sources: CEOReadSources,
): Promise<{ recommendations: CEORecommendation[]; routing: CEORoutingRecord }> {
  const recommendations: CEORecommendation[] = [];
  const ventures = sources.portfolio.ventures;
  const topHealthy = ventures.find((v) => v.health === "HEALTHY" && v.valueStatus !== "UNKNOWN");
  if (topHealthy) {
    recommendations.push(
      buildRecommendation({
        title: `Prioritize ${topHealthy.name}`,
        decisionType: "PRIORITIZE_VENTURE",
        affectedVentureId: topHealthy.ventureId,
        reason: "Healthy venture with validated momentum should receive focus",
        evidence: [`health=${topHealthy.health}`, `valueStatus=${topHealthy.valueStatus}`],
        missingEvidence: [],
        confidence: 0.74,
        expectedBenefit: "Higher portfolio-level throughput and value creation",
        estimatedCost: "Reallocation only (no net new spend)",
        risk: "MEDIUM",
        reversibility: "REVERSIBLE",
        alternatives: ["Keep equal priority allocation", "Delay reprioritization by one review cycle"],
        recommendedDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
      }),
    );
  }
  const noEvidence = ventures.find((v) =>
    sources.valueSnapshots.some((s) => s.ventureId === v.ventureId && (s.missingEvidence?.length ?? 0) > 0),
  );
  if (noEvidence) {
    recommendations.push(
      buildRecommendation({
        title: `Validate ${noEvidence.name} before build`,
        decisionType: "VALIDATE_BEFORE_BUILD",
        affectedVentureId: noEvidence.ventureId,
        reason: "Missing evidence indicates validation gap",
        evidence: ["Value snapshot missing evidence", "Uncertainty is explicit"],
        missingEvidence: sources.valueSnapshots.find((s) => s.ventureId === noEvidence.ventureId)?.missingEvidence ?? [],
        confidence: 0.71,
        expectedBenefit: "Avoid no-value build work and improve evidence quality",
        estimatedCost: "Low (research/interview spend)",
        risk: "LOW",
        reversibility: "REVERSIBLE",
        alternatives: ["Continue building at reduced scope", "Pause and reassess in next briefing"],
        recommendedDeadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      }),
    );
  }
  const paused = ventures.find((v) => v.paused);
  if (paused) {
    recommendations.push(
      buildRecommendation({
        title: `Keep ${paused.name} paused`,
        decisionType: "PAUSE",
        affectedVentureId: paused.ventureId,
        reason: "Current constraints and priority distribution favor continued pause",
        evidence: [`paused=${paused.paused}`, `activeExecutions=${paused.activeExecutions}`],
        missingEvidence: [],
        confidence: 0.6,
        expectedBenefit: "Preserve capacity for validated opportunities",
        estimatedCost: "None",
        risk: "MEDIUM",
        reversibility: "REVERSIBLE",
        alternatives: ["Resume with low priority", "Archive venture"],
        recommendedDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
      }),
    );
  }
  const sharedAsset = sources.portfolio.sharedAssets[0];
  if (sharedAsset) {
    recommendations.push(
      buildRecommendation({
        title: `Reuse asset ${sharedAsset.name}`,
        decisionType: "REUSE_ASSET",
        affectedVentureId: sharedAsset.ownerVentureId,
        reason: "Shared asset can reduce duplicate implementation effort",
        evidence: [`assetType=${sharedAsset.assetType}`, `version=${sharedAsset.version}`],
        missingEvidence: [],
        confidence: 0.69,
        expectedBenefit: "Lower implementation time and cost across ventures",
        estimatedCost: "Low integration effort",
        risk: "LOW",
        reversibility: "REVERSIBLE",
        alternatives: ["Build isolated equivalent per venture"],
        recommendedDeadline: new Date(Date.now() + 4 * 86400000).toISOString(),
      }),
    );
  }
  const unresolvedDependency = sources.dependencies.find((d) => !d.approved);
  if (unresolvedDependency) {
    recommendations.push(
      buildRecommendation({
        title: `Resolve dependency for ${unresolvedDependency.sourceVentureId}`,
        decisionType: "RESOLVE_DEPENDENCY",
        affectedVentureId: unresolvedDependency.sourceVentureId,
        reason: "Unapproved dependency is blocking execution confidence",
        evidence: [`dependsOn=${unresolvedDependency.targetVentureId}`, "approved=false"],
        missingEvidence: ["Dependency approval decision"],
        confidence: 0.66,
        expectedBenefit: "Reduce execution blockers and delivery uncertainty",
        estimatedCost: "Low coordination cost",
        risk: "MEDIUM",
        reversibility: "REVERSIBLE",
        alternatives: ["Remove dependency", "Replace upstream asset"],
        recommendedDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
      }),
    );
  }
  const criticalRisk = sources.risks.find((r) => r.severity === "CRITICAL");
  if (criticalRisk) {
    recommendations.push(
      buildRecommendation({
        title: "Request human review for critical risk",
        decisionType: "REQUEST_HUMAN_REVIEW",
        affectedVentureId: criticalRisk.ventureId ?? ventures[0]?.ventureId ?? "unknown",
        reason: "Critical risk requires explicit senior decision",
        evidence: [criticalRisk.message],
        missingEvidence: ["Human review outcome"],
        confidence: 0.82,
        expectedBenefit: "Prevent irreversible error under uncertainty",
        estimatedCost: "Leadership review time",
        risk: "CRITICAL",
        reversibility: "PARTIALLY_REVERSIBLE",
        alternatives: ["Delay decision", "Apply temporary mitigation"],
        recommendedDeadline: new Date(Date.now() + 1 * 86400000).toISOString(),
      }),
    );
  }

  const capability = getCapabilityById("analyze_competitors");
  const ai = await runAIRuntime({
    task: "ceo-brief",
    userInput: `Generate compact portfolio CEO rationale for ${portfolioId}.`,
    context: {
      ventureId: sources.portfolio.ventures[0]?.ventureId,
      sources: ["portfolio", "decision-graph", "memory"],
      metadata: { capability: capability?.id ?? "analyze_competitors", department: "ceo" },
    },
    writeDecision: false,
    writeMemory: false,
  });
  const routing: CEORoutingRecord = {
    provider: ai.provider,
    model: ai.model,
    promptVersion: "program-6140-v1",
    tokenUsageEstimate: Number(ai.metadata.inputTokensEstimate ?? 0),
    estimatedCost: ai.costEstimate,
    latencyMs: ai.latencyMs,
    outputValidation: ai.output.length > 0 ? "PASS" : "WARN",
  };
  state.routing.push(routing);
  state.recommendations.set(portfolioId, recommendations);
  recommendations.forEach((r) => addAudit("CEORecommendationCreated", r.title, r.id));
  return { recommendations, routing };
}

export function generateCEOBrief(portfolioId: string, sources: CEOReadSources): CEOBrief {
  const fingerprint = hashInput(sources);
  const existing = state.briefs.get(portfolioId);
  if (existing && existing.inputFingerprint === fingerprint) {
    return existing;
  }
  const brief: CEOBrief = {
    id: `ceo-brief-${Date.now()}`,
    portfolioId,
    generatedAt: now(),
    freshness: "LIVE",
    portfolioStatus: sources.portfolio.status,
    changesSinceLastReview: sources.activity.slice(0, 8).map((a) => a.label),
    topOpportunities: sources.portfolio.ventures
      .filter((v) => v.health === "HEALTHY")
      .slice(0, 3)
      .map((v) => `${v.name}: healthy + ${v.valueStatus}`),
    topRisks: sources.risks.slice(0, 3).map((r) => r.message),
    blockedVentures: sources.blockers.map((b) => b.ventureId),
    resourcesSummary: sources.portfolio.capacity.map((c) => `${c.resourceType}: ${c.used}/${c.limit}`),
    valueMilestones: sources.valueSnapshots.slice(0, 5).map((v) => `${v.ventureId}: stage=${v.stage ?? "UNKNOWN"}`),
    decisionsRequired: sources.approvals.filter((a) => a.status !== "APPROVED").map((a) => a.title),
    recommendedActions: [
      "Prioritize evidence-backed ventures",
      "Validate ventures with missing evidence before build",
      "Resolve unapproved dependencies",
    ],
    inputFingerprint: fingerprint,
  };
  state.briefs.set(portfolioId, brief);
  addAudit("CEOBriefGenerated", `Brief generated for ${portfolioId}`);
  return brief;
}

export function setCEOMode(mode: CEOMode): CEOMode {
  state.mode = mode;
  addAudit("CEOModeChanged", `Mode changed to ${mode}`);
  return mode;
}

export function approveCEORecommendation(portfolioId: string, recommendationId: string): CEORecommendation | null {
  const list = state.recommendations.get(portfolioId) ?? [];
  const idx = list.findIndex((r) => r.id === recommendationId);
  if (idx < 0) return null;
  const approved = { ...list[idx]!, status: "APPROVED" as const };
  list[idx] = approved;
  addAudit("CEORecommendationApproved", approved.title, approved.id);
  return approved;
}

export function rejectCEORecommendation(portfolioId: string, recommendationId: string): CEORecommendation | null {
  const list = state.recommendations.get(portfolioId) ?? [];
  const idx = list.findIndex((r) => r.id === recommendationId);
  if (idx < 0) return null;
  const rejected = { ...list[idx]!, status: "REJECTED" as const };
  list[idx] = rejected;
  addAudit("CEORecommendationRejected", rejected.title, rejected.id);
  return rejected;
}

export function executeApprovedCEOAction(
  portfolioId: string,
  recommendationId: string,
): { executed: boolean; reason: string } {
  const rec = (state.recommendations.get(portfolioId) ?? []).find((r) => r.id === recommendationId);
  if (!rec) return { executed: false, reason: "Recommendation not found" };
  if (rec.status !== "APPROVED") return { executed: false, reason: "Recommendation is not approved" };
  const gate = canExecuteInMode(state.mode, rec.decisionType);
  if (!gate.allowed) return { executed: false, reason: gate.reason };
  addAudit("CEOActionExecuted", rec.title, rec.id);
  return { executed: true, reason: "Executed reversible action within policy" };
}

export function getCEOBrief(portfolioId: string): CEOBrief | null {
  return state.briefs.get(portfolioId) ?? null;
}
export function getCEORecommendations(portfolioId: string): CEORecommendation[] {
  return state.recommendations.get(portfolioId) ?? [];
}
export function getCEOPendingApprovals(portfolioId: string): CEORecommendation[] {
  return getCEORecommendations(portfolioId).filter((r) => r.requiredApproval && r.status === "PENDING_APPROVAL");
}
export function getCEODecisionHistory(): CEOAuditRecord[] {
  return [...state.audit];
}
export function getCEOWhatChanged(portfolioId: string): string[] {
  const brief = getCEOBrief(portfolioId);
  return brief?.changesSinceLastReview ? [...brief.changesSinceLastReview] : [];
}
export function getCEORoutingHistory(): CEORoutingRecord[] {
  return [...state.routing];
}
export function getCurrentCEOMode(): CEOMode {
  return state.mode;
}

