import { describe, expect, it } from "vitest";
import { canExecuteInMode, getCEOApprovalGate } from "../policy-engine";
import { generateCEOBrief, generateCEORecommendations, setCEOMode } from "../service";
import type { CEOReadSources } from "../../../domain/venture-ceo";

const sources: CEOReadSources = {
  portfolio: {
    generatedAt: new Date().toISOString(),
    freshness: "LIVE",
    portfolioId: "p1",
    workspaceId: "w1",
    name: "RAFAEL VENTURES LAB",
    slug: "rafael-ventures-lab",
    status: "ACTIVE",
    summary: {
      portfolioId: "p1",
      workspaceId: "w1",
      name: "RVL",
      totalVentures: 3,
      activeVentures: 2,
      pausedVentures: 1,
      closedVentures: 0,
      criticalPriority: 1,
      atRiskVentures: 1,
      activeExecutions: 1,
      queuedExecutions: 0,
    },
    metrics: {} as never,
    capacity: [{ resourceType: "AI_EXECUTION", limit: 10, used: 4, available: 6, utilizationPercent: 40 }],
    ventures: [
      {
        ventureId: "v1", name: "A", slug: "a", priority: "HIGH", lifecycle: "BUILDING", paused: false, archived: false, closed: false,
        health: "HEALTHY", valueStatus: "VALIDATED", blockers: [], activeExecutions: 1, updatedAt: new Date().toISOString(),
      },
      {
        ventureId: "v2", name: "B", slug: "b", priority: "NORMAL", lifecycle: "VALIDATING", paused: true, archived: false, closed: false,
        health: "AT_RISK", valueStatus: "UNKNOWN", blockers: ["missing evidence"], activeExecutions: 0, updatedAt: new Date().toISOString(),
      },
    ],
    risks: [{ id: "r1", ventureId: "v2", severity: "CRITICAL", category: "RISK", message: "critical dependency" }],
    activity: [{ id: "a1", at: new Date().toISOString(), type: "update", label: "updated", ventureId: "v1" }],
    allocations: [{ id: "al1", ventureId: "v1", resourceType: "AI_EXECUTION", limit: 10, used: 4, reserved: 0, available: 6, status: "AVAILABLE", period: "monthly" }],
    dependencies: [{ id: "d1", sourceVentureId: "v1", targetVentureId: "v2", dependencyType: "TECHNICAL", approved: false, risk: "HIGH" }],
    sharedAssets: [{ id: "s1", name: "auth", assetType: "AUTH_PACKAGE", ownerVentureId: "v1", approvalStatus: "APPROVED", version: "1.0.0" }],
    policies: [{ id: "p", kind: "MAX_ACTIVE_VENTURES", enabled: true, config: { max: 3 } }],
    decisions: [],
  },
  valueSnapshots: [{ ventureId: "v2", missingEvidence: ["customer interviews"] }],
  evidence: [{ ventureId: "v1", summary: "pilot complete" }],
  economics: [{ ventureId: "v1", hasActualRevenue: false }],
  resourceAllocations: [{ ventureId: "v1", available: 6, resourceType: "AI_EXECUTION" }],
  activeExecutions: [{ ventureId: "v1", count: 1 }],
  risks: [{ ventureId: "v2", severity: "CRITICAL", message: "critical dependency" }],
  blockers: [{ ventureId: "v2", message: "missing evidence" }],
  approvals: [],
  policies: [{ kind: "MAX_ACTIVE_VENTURES", enabled: true, config: { max: 3 } }],
  dependencies: [{ sourceVentureId: "v1", targetVentureId: "v2", approved: false }],
  activity: [{ id: "a1", label: "updated", at: new Date().toISOString(), ventureId: "v1" }],
};

describe("PROGRAM 6140 safety", () => {
  it("requires approval for irreversible decisions", () => {
    expect(getCEOApprovalGate("CLOSE").requiresApproval).toBe(true);
    expect(getCEOApprovalGate("PIVOT").requiresApproval).toBe(true);
    expect(getCEOApprovalGate("MERGE").requiresApproval).toBe(true);
  });

  it("advisory mode never executes", () => {
    setCEOMode("ADVISORY");
    const gate = canExecuteInMode("ADVISORY", "REDUCE_SCOPE");
    expect(gate.allowed).toBe(false);
  });

  it("generates recommendations with evidence and uncertainty", async () => {
    const result = await generateCEORecommendations("p1", sources);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(5);
    expect(result.recommendations.some((r) => r.decisionType === "PRIORITIZE_VENTURE")).toBe(true);
    expect(result.recommendations.some((r) => r.decisionType === "VALIDATE_BEFORE_BUILD")).toBe(true);
    expect(result.recommendations.some((r) => r.decisionType === "PAUSE")).toBe(true);
    expect(result.recommendations.some((r) => r.decisionType === "REUSE_ASSET")).toBe(true);
    expect(result.recommendations.some((r) => r.decisionType === "RESOLVE_DEPENDENCY")).toBe(true);
    expect(result.recommendations.some((r) => r.decisionType === "REQUEST_HUMAN_REVIEW")).toBe(true);
    expect(result.recommendations.every((r) => Array.isArray(r.missingEvidence))).toBe(true);
    expect(result.routing.provider.length).toBeGreaterThan(0);
  });

  it("does not regenerate brief when unchanged", () => {
    const first = generateCEOBrief("p1", sources);
    const second = generateCEOBrief("p1", sources);
    expect(first.id).toBe(second.id);
  });
});

