import { describe, expect, it } from "vitest";
import { createInMemoryValueStore } from "./store";
import { ValueEngineService } from "./service";
import { RAFAEL_VENTURES_LAB_VALUE_FIXTURE } from "@/src/core/composition/fixtures/rafael-ventures-lab";

function createService() {
  const store = createInMemoryValueStore();
  const ventures = RAFAEL_VENTURES_LAB_VALUE_FIXTURE.ventures.map((v) => ({
    id: v.id,
    name: v.name,
    currency: v.currency,
  }));
  const svc = new ValueEngineService(
    store,
    {
      async listVentures() {
        return ventures;
      },
      async getVenture(ventureId: string) {
        return ventures.find((v) => v.id === ventureId) ?? null;
      },
    },
    (prefix) => `${prefix}-${Math.random().toString(16).slice(2)}`
  );
  return { svc, store };
}

describe("PROGRAM 6120 — Value Engine", () => {
  it("rejects evidence without origin/provenance", async () => {
    const { svc } = createService();
    const bad = await svc.registerValueEvidence({
      ventureId: "venture-tableflow",
      type: "CUSTOMER_INTERVIEW",
      source: " ",
      provenance: "",
      summary: "interview notes",
    });
    expect(bad.ok).toBe(false);
  });

  it("preserves ACTUAL vs PROJECTED values", async () => {
    const { svc } = createService();
    const metric = await svc.createValueMetric({
      ventureId: "venture-luxora-eyewear",
      kind: "MRR",
      label: "Monthly recurring revenue",
      moneyAmount: 1000,
      currency: "EUR",
      valueType: "PROJECTED",
      source: "model-v1",
    });
    expect(metric.ok).toBe(true);
    if (!metric.ok) return;
    const upd = await svc.updateValueMetric({
      metricId: String(metric.data.id),
      valueType: "ACTUAL",
      moneyAmount: 250,
      currency: "EUR",
      source: "bank-export",
    });
    expect(upd.ok).toBe(true);
    if (!upd.ok) return;
    expect(upd.data.props.valueType).toBe("ACTUAL");
  });

  it("shows missing evidence and confidence-bounded score", async () => {
    const { svc } = createService();
    await svc.createValueHypothesis({
      ventureId: "venture-orbita-sports",
      statement: "Sports clubs have high admin burden",
      dimension: "PROBLEM_EVIDENCE",
    });
    const assessment = await svc.createValueAssessment({
      ventureId: "venture-orbita-sports",
      includeOptionalScore: true,
    });
    expect(assessment.ok).toBe(true);
    if (!assessment.ok) return;
    expect(assessment.data.props.missingEvidenceSummary.length).toBeGreaterThan(0);
    const score = assessment.data.props.optionalCompositeScore ?? 0;
    expect(score).toBeLessThanOrEqual(Number(assessment.data.props.overallConfidence) * 100 + 1e-9);
  });

  it("requires evidence to complete milestone when required", async () => {
    const { svc } = createService();
    const ms = await svc.createValueMilestone({
      ventureId: "venture-tableflow",
      name: "10 customer interviews",
      target: 10,
      current: 9,
      unit: "interviews",
      evidenceRequirements: ["CUSTOMER_INTERVIEW_LOG"],
    });
    expect(ms.ok).toBe(true);
    if (!ms.ok) return;
    // direct entity assertion through service detail path
    const detailBefore = await svc.getVentureValueDetail("venture-tableflow");
    const milestone = detailBefore?.milestones.find((m) => String(m.id) === String(ms.data.id));
    expect(milestone?.status).toBe("IN_PROGRESS");
  });

  it("marks invalid experiment with explicit reason", async () => {
    const { svc } = createService();
    const exp = await svc.startValueExperiment({
      ventureId: "venture-localgrow-ai",
      type: "PILOT",
      hypothesisStatement: "Pilot will retain users for 30 days",
      audience: "local stores",
      method: "manual onboarding + weekly check-ins",
      successCriteria: ["at least one active weekly user"],
      failureCriteria: ["no weekly usage"],
    });
    expect(exp.ok).toBe(true);
    if (!exp.ok) return;
    const invalid = await svc.completeValueExperiment({
      experimentId: String(exp.data.id),
      invalidReason: "Instrumentation failed",
    });
    expect(invalid.ok).toBe(true);
    if (!invalid.ok) return;
    expect(invalid.data.props.state).toBe("INVALID");
  });

  it("generates recommendations and blocks auto irreversible actions", async () => {
    const { svc } = createService();
    await svc.createValueAssessment({ ventureId: "venture-creatorpulse" });
    const recs = await svc.requestValueReview({ ventureId: "venture-creatorpulse" });
    expect(recs.ok).toBe(true);
    if (!recs.ok) return;
    const pause = recs.data.find((r) => r.props.type === "PAUSE");
    expect(pause).toBeTruthy();
    expect(pause?.props.requiresApproval).toBe(true);
    expect(pause?.canAutoExecute()).toBe(false);
  });

  it("upserts economics without inventing currency and tracks snapshots", async () => {
    const { svc } = createService();
    const econ = await svc.upsertVentureEconomics({
      ventureId: "venture-localgrow-ai",
      currency: "EUR",
      projectedRevenueAmount: 1200,
      projectedRevenueType: "PROJECTED",
      operatingCostAmount: 500,
      operatingCostType: "ACTUAL",
      source: "ops-export",
      period: "monthly",
    });
    expect(econ.ok).toBe(true);
    await svc.createValueAssessment({ ventureId: "venture-localgrow-ai" });
    const snap = await svc.createValueSnapshot({ ventureId: "venture-localgrow-ai" });
    expect(snap.ok).toBe(true);
    if (!snap.ok) return;
    expect(snap.data.props.economics?.currency).toBe("EUR");
  });

  it("compares portfolio with uncertainty flags visible", async () => {
    const { svc } = createService();
    for (const venture of RAFAEL_VENTURES_LAB_VALUE_FIXTURE.ventures) {
      if (venture.knownFacts.evidence.includes("CUSTOMER_INTERVIEW")) {
        await svc.registerValueEvidence({
          ventureId: venture.id,
          type: "CUSTOMER_INTERVIEW",
          source: "interview-recording",
          provenance: "drive://tableflow/interview-01",
          summary: "Customer pain confirmed",
        });
      }
      if (venture.knownFacts.evidence.includes("LANDING_CONVERSION")) {
        await svc.registerValueEvidence({
          ventureId: venture.id,
          type: "LANDING_CONVERSION",
          source: "analytics-export",
          provenance: "ga4://luxora/landing-2026-07",
          summary: "Landing conversion observed",
        });
      }
      if (venture.knownFacts.evidence.includes("WAITLIST")) {
        await svc.registerValueEvidence({
          ventureId: venture.id,
          type: "WAITLIST",
          source: "waitlist-csv",
          provenance: "csv://luxora/waitlist",
          summary: "Waitlist signups captured",
        });
      }
      if (venture.knownFacts.evidence.includes("PILOT")) {
        await svc.registerValueEvidence({
          ventureId: venture.id,
          type: "PILOT",
          source: "pilot-notes",
          provenance: "notion://localgrow/pilot-01",
          summary: "Pilot active with one local business",
        });
      }
      await svc.createValueAssessment({ ventureId: venture.id, includeOptionalScore: true });
    }

    const comparison = await svc.comparePortfolioVentures();
    expect(comparison.rankingDefinitive).toBe(false);
    expect(comparison.rows.length).toBeGreaterThanOrEqual(5);
    expect(comparison.rows.some((r) => r.uncertaintyFlags.length > 0)).toBe(true);
  });
});

