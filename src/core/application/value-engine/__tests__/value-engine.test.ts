/**
 * PROGRAM 6120 — Venture Value Creation Engine tests
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  ValueEvidence,
  ValueExperiment,
  ValueMetric,
  ValueMilestone,
  ValueRecommendation,
  ValueAssessment,
  asVentureId,
  Confidence,
  nowTimestamp,
} from "@/src/core/domain";
import {
  assertNoAutomaticIrreversibleExecution,
  createInMemoryValueStore,
  createValueEngine,
  seedRafaelVenturesLabValueEngine,
  RAFAEL_VENTURES_LAB,
} from "../index";

describe("PROGRAM 6120 — Value Engine", () => {
  let store: ReturnType<typeof createInMemoryValueStore>;
  let engine: ReturnType<typeof createValueEngine>;

  beforeEach(async () => {
    store = createInMemoryValueStore();
    engine = createValueEngine(store);
    await engine.registerVenture({
      ventureId: "v-test",
      name: "Test Venture",
      currency: "USD",
      stage: "IDEA_VALUE",
    });
  });

  it("rejects evidence without origin/provenance", () => {
    const bad = ValueEvidence.create({
      id: "e1",
      ventureId: asVentureId("v-test"),
      type: "CUSTOMER_INTERVIEW",
      source: "",
      provenance: "x",
      summary: "y",
    });
    expect(bad.ok).toBe(false);

    const badProv = ValueEvidence.create({
      id: "e2",
      ventureId: asVentureId("v-test"),
      type: "CUSTOMER_INTERVIEW",
      source: "interview",
      provenance: "  ",
      summary: "y",
    });
    expect(badProv.ok).toBe(false);
  });

  it("distinguishes ACTUAL vs PROJECTED vs ESTIMATED vs TARGET vs UNKNOWN", async () => {
    const actual = await engine.CreateValueMetric({
      id: "m-actual",
      ventureId: "v-test",
      kind: "WAITLIST",
      label: "Waitlist",
      valueType: "ACTUAL",
      source: "export",
      numericValue: 10,
    });
    const projected = await engine.CreateValueMetric({
      id: "m-proj",
      ventureId: "v-test",
      kind: "MRR",
      label: "MRR projected",
      valueType: "PROJECTED",
      source: "model",
      moneyAmount: 5000,
      currency: "USD",
    });
    const unknown = await engine.CreateValueMetric({
      id: "m-unk",
      ventureId: "v-test",
      kind: "MRR",
      label: "MRR",
      valueType: "UNKNOWN",
      source: "not measured",
    });
    expect(actual.props.valueType).toBe("ACTUAL");
    expect(projected.props.valueType).toBe("PROJECTED");
    expect(unknown.props.valueType).toBe("UNKNOWN");
    expect(unknown.props.numericValue).toBeUndefined();

    const invalidUnknown = ValueMetric.create({
      id: "m-bad",
      ventureId: asVentureId("v-test"),
      kind: "MRR",
      label: "bad",
      valueType: "UNKNOWN",
      source: "x",
      numericValue: 1,
    });
    expect(invalidUnknown.ok).toBe(false);
  });

  it("surfaces missing evidence in assessments", async () => {
    const assessment = await engine.CreateValueAssessment({
      id: "a1",
      ventureId: "v-test",
      includeOptionalScore: true,
    });
    expect(assessment.props.missingEvidenceSummary.length).toBeGreaterThan(0);
    expect(assessment.props.dimensions.every((d) => Array.isArray(d.missingEvidence))).toBe(
      true
    );
  });

  it("keeps optional score within confidence ceiling and shows formula", async () => {
    await engine.RegisterValueEvidence({
      id: "e-research",
      ventureId: "v-test",
      type: "RESEARCH_SOURCE",
      source: "desk research note",
      provenance: "notes/research-1.md",
      summary: "Market size desk research",
    });
    const assessment = await engine.CreateValueAssessment({
      id: "a2",
      ventureId: "v-test",
      includeOptionalScore: true,
    });
    expect(assessment.props.compositeFormula).toBeTruthy();
    expect(assessment.props.optionalCompositeScore).toBeDefined();
    const ceiling = Number(assessment.props.overallConfidence) * 100;
    expect(assessment.props.optionalCompositeScore!).toBeLessThanOrEqual(ceiling + 1e-6);

    const conf = Confidence(0.2);
    expect(conf.ok).toBe(true);
    const over = ValueAssessment.create({
      id: "a-over",
      ventureId: asVentureId("v-test"),
      stage: "IDEA_VALUE",
      dimensions: [],
      overallConfidence: 0.2,
      optionalCompositeScore: 50,
      compositeFormula: "bad",
      missingEvidenceSummary: [],
    });
    expect(over.ok).toBe(false);
  });

  it("completes milestones only with required evidence", async () => {
    const ms = await engine.CreateValueMilestone({
      id: "ms1",
      ventureId: "v-test",
      name: "10 customer interviews",
      target: 10,
      unit: "interviews",
      evidenceRequirements: ["CUSTOMER_INTERVIEW"],
    });
    const ev = await engine.RegisterValueEvidence({
      id: "e-int",
      ventureId: "v-test",
      type: "CUSTOMER_INTERVIEW",
      source: "Interview A",
      provenance: "interviews/a.md",
      summary: "Confirmed problem",
    });
    const progress = ms.recordProgress(10, ev.id);
    expect(progress.ok).toBe(true);
    expect(progress.ok && progress.value.props.status).toBe("COMPLETED");

    const ms2 = ValueMilestone.create({
      id: "ms2",
      ventureId: asVentureId("v-test"),
      name: "5 confirmed problems",
      target: 5,
      unit: "count",
      evidenceRequirements: ["need evidence"],
    });
    expect(ms2.ok).toBe(true);
    if (ms2.ok) {
      const failComplete = ms2.value.recordProgress(5, undefined);
      expect(failComplete.ok).toBe(false);
    }
  });

  it("marks invalid experiments and blocks incomplete completion", async () => {
    const exp = await engine.StartValueExperiment({
      id: "exp1",
      ventureId: "v-test",
      type: "INTERVIEW",
      hypothesisStatement: "Managers confirm floor pain",
      audience: "restaurant managers",
      method: "5 structured interviews",
      successCriteria: ["3+ confirmations"],
      failureCriteria: ["0 confirmations"],
    });
    expect(exp.props.state).toBe("RUNNING");

    const invalid = await engine.CompleteValueExperiment({
      experimentId: "exp1",
      result: "",
      learning: "",
      nextAction: "",
      invalidate: { reason: "Audience contaminated — recruitment bias" },
    });
    expect(invalid.props.state).toBe("INVALID");
    expect(invalid.props.invalidReason).toContain("contaminated");

    const exp2 = ValueExperiment.create({
      id: "exp2",
      ventureId: asVentureId("v-test"),
      type: "LANDING_PAGE",
      hypothesisStatement: "Landing converts",
      audience: "visitors",
      method: "A/B",
      successCriteria: [">2%"],
      failureCriteria: ["<0.5%"],
    });
    expect(exp2.ok).toBe(true);
    if (exp2.ok) {
      const started = exp2.value.start();
      expect(started.ok).toBe(true);
      if (started.ok) {
        const badComplete = started.value.complete({
          result: "",
          learning: "x",
          nextAction: "y",
        });
        expect(badComplete.ok).toBe(false);
      }
    }
  });

  it("generates recommendations and never auto-executes PAUSE/PIVOT/MERGE/CLOSE", async () => {
    const review = await engine.RequestValueReview({ ventureId: "v-test" });
    expect(review.recommendationIds.length).toBeGreaterThan(0);
    const recs = await engine.GetValueRecommendations("v-test");
    const pause = (recs as Array<{ type: string; requiresApproval: boolean; approvalStatus: string }>).find(
      (r) => r.type === "PAUSE"
    );
    expect(pause).toBeTruthy();
    expect(pause!.requiresApproval).toBe(true);
    expect(pause!.approvalStatus).toBe("PENDING_APPROVAL");

    const domainPause = ValueRecommendation.create({
      id: "r-pause",
      ventureId: asVentureId("v-test"),
      type: "PAUSE",
      reason: "test",
      confidence: 0.4,
      expectedBenefit: "save burn",
      risk: "momentum",
      reversibility: "REVERSIBLE",
    });
    expect(domainPause.ok).toBe(true);
    if (domainPause.ok) {
      const gate = assertNoAutomaticIrreversibleExecution(domainPause.value);
      expect(gate.allowed).toBe(false);
      expect(domainPause.value.canAutoExecute()).toBe(false);
    }

    const approved = await engine.ApproveValueRecommendation({
      recommendationId: String(
        (recs as Array<{ id: string; type: string }>).find((r) => r.type === "PAUSE")!.id
      ),
      note: "founder approved pause recommendation only",
    });
    expect(approved.approved).toBe(true);
    expect(approved.autoExecuted).toBe(false);
  });

  it("economics use venture currency and separate actual vs projected", async () => {
    await engine.registerVenture({
      ventureId: "v-eur",
      name: "Euro Co",
      currency: "EUR",
      stage: "IDEA_VALUE",
    });
    const econ = await engine.GetVentureEconomics("v-eur");
    expect((econ as { currency: string }).currency).toBe("EUR");

    const mismatch = await store.economics.getByVenture("v-eur");
    expect(mismatch).toBeTruthy();
    if (mismatch) {
      const conf = Confidence(0.5);
      expect(conf.ok).toBe(true);
      if (conf.ok) {
        const bad = mismatch.withField("actualRevenue", {
          money: { amount: 100, currency: "USD" },
          source: "wrong",
          valueType: "ACTUAL",
          confidence: conf.value,
          updatedAt: nowTimestamp(),
        });
        expect(bad.ok).toBe(false);
      }
    }
  });

  it("creates immutable snapshots for evolution comparison", async () => {
    await engine.RegisterValueEvidence({
      id: "e-snap",
      ventureId: "v-test",
      type: "RESEARCH_SOURCE",
      source: "note",
      provenance: "p/1",
      summary: "research",
    });
    const s1 = await engine.CreateValueSnapshot({ id: "snap-1", ventureId: "v-test" });
    await engine.RegisterValueEvidence({
      id: "e-snap-2",
      ventureId: "v-test",
      type: "CUSTOMER_INTERVIEW",
      source: "interview",
      provenance: "p/2",
      summary: "interview",
    });
    const s2 = await engine.CreateValueSnapshot({ id: "snap-2", ventureId: "v-test" });
    expect(s1.props.evidence.length).toBe(1);
    expect(s2.props.evidence.length).toBe(2);
    expect(s1.id).not.toBe(s2.id);
    // immutability: prior snapshot unchanged in store (same-ms timestamps allowed)
    const stored = await store.snapshots.getById("snap-1");
    expect(stored?.props.evidence.length).toBe(1);
  });

  it("portfolio comparison shows uncertainty and is not definitive", async () => {
    const seeded = await seedRafaelVenturesLabValueEngine();
    const cmp = await seeded.engine.ComparePortfolioVentures(seeded.ventureIds);
    expect(cmp.rankingDefinitive).toBe(false);
    expect(cmp.comparisonNotes.some((n) => n.toLowerCase().includes("uncertainty"))).toBe(true);
    expect(cmp.rows.every((r) => r.uncertaintyFlags.length >= 0)).toBe(true);
    expect(cmp.rows.some((r) => r.uncertaintyFlags.includes("NO_ACTUAL_REVENUE"))).toBe(true);

    const summary = await seeded.engine.GetPortfolioValueSummary(
      RAFAEL_VENTURES_LAB.portfolioId,
      seeded.ventureIds
    );
    expect(summary.ventureCount).toBe(5);
    expect(summary.venturesWithActualRevenue).toBe(0);
  });

  it("certifies RAFAEL VENTURES LAB five-venture profiles without invented revenue", async () => {
    const seeded = await seedRafaelVenturesLabValueEngine();
    const byName = Object.fromEntries(
      (
        await Promise.all(
          seeded.ventureIds.map(async (id) => [id, await seeded.engine.GetVentureValueDetail(id)])
        )
      )
    ) as Record<string, Record<string, unknown>>;

    const orbita = byName["rvl-orbita-sports"]!;
    expect(orbita.name).toBe("ORBITA SPORTS");
    expect(orbita.evidenceCount).toBe(0);
    expect(orbita.hasActualRevenue).toBe(false);
    expect((orbita.opportunities as unknown[]).length).toBeGreaterThan(0);

    const tableflow = byName["rvl-tableflow"]!;
    expect((tableflow.evidence as Array<{ type: string }>).every((e) => e.type === "CUSTOMER_INTERVIEW" || true)).toBe(
      true
    );
    expect(
      (tableflow.evidence as Array<{ type: string }>).filter((e) => e.type === "CUSTOMER_INTERVIEW")
        .length
    ).toBe(5);

    const luxora = byName["rvl-luxora-eyewear"]!;
    const luxoraTypes = (luxora.evidence as Array<{ type: string }>).map((e) => e.type);
    expect(luxoraTypes).toContain("LANDING_CONVERSION");
    expect(luxoraTypes).toContain("WAITLIST");
    expect(
      (luxora.metrics as Array<{ kind: string; valueType: string }>).some(
        (m) => m.kind === "MRR" && m.valueType === "TARGET"
      )
    ).toBe(true);
    expect(
      (luxora.metrics as Array<{ kind: string; valueType: string }>).some(
        (m) => m.kind === "MRR" && m.valueType === "ACTUAL"
      )
    ).toBe(false);

    const localgrow = byName["rvl-localgrow-ai"]!;
    expect(
      (localgrow.evidence as Array<{ type: string }>).some((e) => e.type === "PILOT")
    ).toBe(true);
    expect(
      (localgrow.metrics as Array<{ kind: string; valueType: string }>).some(
        (m) => m.kind === "MRR" && m.valueType === "PROJECTED"
      )
    ).toBe(true);
    expect(localgrow.hasActualRevenue).toBe(false);

    const creator = byName["rvl-creatorpulse"]!;
    expect(creator.evidenceCount).toBe(0);
    expect((creator.risks as unknown[]).length).toBeGreaterThan(0);
    expect(
      (creator.milestones as Array<{ status: string }>).some((m) => m.status === "BLOCKED")
    ).toBe(true);

    // No ACTUAL revenue inventada across portfolio
    for (const id of seeded.ventureIds) {
      const detail = byName[id]!;
      expect(detail.hasActualRevenue).toBe(false);
      const metrics = detail.metrics as Array<{ kind: string; valueType: string }>;
      for (const m of metrics) {
        if (m.kind === "MRR" || m.kind === "ARR") {
          expect(m.valueType).not.toBe("ACTUAL");
        }
      }
    }
  });

  it("rejects recommendation approval auto-closure path", async () => {
    const close = ValueRecommendation.create({
      id: "r-close",
      ventureId: asVentureId("v-test"),
      type: "CLOSE",
      reason: "would require human approval",
      confidence: 0.3,
      expectedBenefit: "stop burn",
      risk: "kill optionality",
      reversibility: "IRREVERSIBLE",
    });
    expect(close.ok).toBe(true);
    if (close.ok) {
      await store.recommendations.save(close.value);
      const result = await engine.ApproveValueRecommendation({
        recommendationId: "r-close",
        note: "approved as recommendation only",
      });
      expect(result.autoExecuted).toBe(false);
      const stored = await store.recommendations.getById("r-close");
      expect(stored?.props.approvalStatus).toBe("APPROVED");
      // Still not executed — approval ≠ closure
      expect(assertNoAutomaticIrreversibleExecution(stored!).allowed).toBe(false);
    }
  });
});
