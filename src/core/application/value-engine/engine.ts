/**
 * Backward-compatible entrypoint for Program 6120 value engine.
 */

export { ValueEngineService, type VentureCatalog, type ValueCommandResult } from "./service";
export { createInMemoryValueStore } from "./store";

/**
 * Value engine commands & queries — PROGRAM 6120.
 */

import {
  ValueEvidence,
  ValueExperiment,
  ValueHypothesis,
  ValueMetric,
  ValueMilestone,
  ValueSnapshot,
  VentureEconomics,
  asVentureId,
  nowTimestamp,
  Confidence,
  type EvidenceType,
  type ExperimentType,
  type MetricValueType,
  type ValueDimension,
  type ValueEngineRepository,
  type ValueMetricKind,
  type ValueStage,
  type TypedMoneyValue,
} from "@/src/core/domain";
import { assessVentureValue, deriveStageFromEvidence } from "./assessment-engine";
import {
  assertNoAutomaticIrreversibleExecution,
  generateValueRecommendations,
} from "./recommendation-engine";
import {
  comparePortfolioVentures,
  summarizePortfolioValue,
  type ComparePortfolioVenturesResult,
  type PortfolioValueSummary,
} from "./portfolio";

export type VentureValueProfile = Readonly<{
  ventureId: string;
  name: string;
  currency: string;
  stage: ValueStage;
}>;

export type ValueEngine = Readonly<{
  store: ValueEngineRepository;
  registerVenture(profile: VentureValueProfile): Promise<void>;
  // Commands
  CreateValueHypothesis(input: {
    id: string;
    ventureId: string;
    statement: string;
    dimension: ValueDimension;
    assumptions?: readonly string[];
    invalidationCriteria?: readonly string[];
    confidence?: number;
  }): Promise<ValueHypothesis>;
  RegisterValueEvidence(input: {
    id: string;
    ventureId: string;
    type: EvidenceType;
    source: string;
    provenance: string;
    summary: string;
    relatedHypothesisId?: string;
    reliability?: "LOW" | "MEDIUM" | "HIGH" | "VERIFIED";
    derivation?: "DIRECT" | "INFERRED";
    attachmentRef?: string;
    artifactRef?: string;
    observedAt?: string;
  }): Promise<ValueEvidence>;
  CreateValueMetric(input: {
    id: string;
    ventureId: string;
    kind: ValueMetricKind;
    label: string;
    valueType: MetricValueType;
    source: string;
    numericValue?: number;
    moneyAmount?: number;
    currency?: string;
    unit?: string;
    confidence?: number;
    period?: string;
  }): Promise<ValueMetric>;
  UpdateValueMetric(input: {
    metricId: string;
    valueType: MetricValueType;
    source: string;
    numericValue?: number;
    moneyAmount?: number;
    currency?: string;
    confidence?: number;
    period?: string;
  }): Promise<ValueMetric>;
  CreateValueMilestone(input: {
    id: string;
    ventureId: string;
    name: string;
    target: number;
    unit: string;
    current?: number;
    dueDate?: string;
    evidenceRequirements?: readonly string[];
    owner?: string;
    costToMilestone?: TypedMoneyValue;
  }): Promise<ValueMilestone>;
  StartValueExperiment(input: {
    id: string;
    ventureId: string;
    type: ExperimentType;
    hypothesisStatement: string;
    audience: string;
    method: string;
    successCriteria: readonly string[];
    failureCriteria: readonly string[];
    durationDays?: number;
  }): Promise<ValueExperiment>;
  CompleteValueExperiment(input: {
    experimentId: string;
    result: string;
    learning: string;
    nextAction: string;
    evidenceIds?: readonly string[];
    invalidate?: { reason: string };
  }): Promise<ValueExperiment>;
  CreateValueAssessment(input: {
    id: string;
    ventureId: string;
    stage?: ValueStage;
    includeOptionalScore?: boolean;
  }): Promise<ReturnType<typeof assessVentureValue>>;
  CreateValueSnapshot(input: { id: string; ventureId: string }): Promise<ValueSnapshot>;
  RequestValueReview(input: { ventureId: string }): Promise<{
    assessmentId: string;
    recommendationIds: string[];
  }>;
  ApproveValueRecommendation(input: {
    recommendationId: string;
    note?: string;
  }): Promise<{ approved: true; autoExecuted: false }>;
  RejectValueRecommendation(input: {
    recommendationId: string;
    note: string;
  }): Promise<{ rejected: true }>;
  // Queries
  GetVentureValueSummary(ventureId: string): Promise<Record<string, unknown>>;
  GetVentureValueDetail(ventureId: string): Promise<Record<string, unknown>>;
  GetValueEvidence(ventureId: string): Promise<unknown[]>;
  GetValueMilestones(ventureId: string): Promise<unknown[]>;
  GetValueExperiments(ventureId: string): Promise<unknown[]>;
  GetVentureEconomics(ventureId: string): Promise<unknown>;
  GetValueRecommendations(ventureId: string): Promise<unknown[]>;
  ComparePortfolioVentures(ventureIds: readonly string[]): Promise<ComparePortfolioVenturesResult>;
  GetPortfolioValueSummary(portfolioId: string, ventureIds: readonly string[]): Promise<PortfolioValueSummary>;
}>;

export function createValueEngine(store: ValueEngineRepository): ValueEngine {
  const profiles = new Map<string, VentureValueProfile>();

  async function requireProfile(ventureId: string): Promise<VentureValueProfile> {
    const p = profiles.get(ventureId);
    if (!p) throw new Error(`Venture not registered in value engine: ${ventureId}`);
    return p;
  }

  return {
    store,

    async registerVenture(profile) {
      profiles.set(profile.ventureId, profile);
      const existing = await store.economics.getByVenture(profile.ventureId);
      if (!existing) {
        const econ = VentureEconomics.create({
          id: `econ-${profile.ventureId}`,
          ventureId: asVentureId(profile.ventureId),
          currency: profile.currency,
        });
        if (!econ.ok) throw new Error(econ.error.message);
        await store.economics.save(econ.value);
      }
    },

    async CreateValueHypothesis(input) {
      await requireProfile(input.ventureId);
      const h = ValueHypothesis.create({
        id: input.id,
        ventureId: asVentureId(input.ventureId),
        statement: input.statement,
        dimension: input.dimension,
        assumptions: input.assumptions,
        invalidationCriteria: input.invalidationCriteria,
        confidence: input.confidence,
      });
      if (!h.ok) throw new Error(h.error.message);
      await store.hypotheses.save(h.value);
      return h.value;
    },

    async RegisterValueEvidence(input) {
      await requireProfile(input.ventureId);
      const e = ValueEvidence.create({
        id: input.id,
        ventureId: asVentureId(input.ventureId),
        type: input.type,
        source: input.source,
        provenance: input.provenance,
        summary: input.summary,
        reliability: input.reliability,
        derivation: input.derivation,
        attachmentRef: input.attachmentRef,
        artifactRef: input.artifactRef,
        observedAt: input.observedAt as never,
        relatedHypothesisId: input.relatedHypothesisId as never,
      });
      if (!e.ok) throw new Error(e.error.message);
      await store.evidence.save(e.value);
      if (input.relatedHypothesisId) {
        const hyp = await store.hypotheses.getById(input.relatedHypothesisId);
        if (hyp) {
          await store.hypotheses.save(hyp.linkEvidence(e.value.id));
        }
      }
      return e.value;
    },

    async CreateValueMetric(input) {
      const profile = await requireProfile(input.ventureId);
      const m = ValueMetric.create({
        id: input.id,
        ventureId: asVentureId(input.ventureId),
        kind: input.kind,
        label: input.label,
        valueType: input.valueType,
        source: input.source,
        numericValue: input.numericValue,
        moneyAmount: input.moneyAmount,
        currency: input.currency ?? profile.currency,
        unit: input.unit,
        confidence: input.confidence,
        period: input.period,
      });
      if (!m.ok) throw new Error(m.error.message);
      await store.metrics.save(m.value);
      return m.value;
    },

    async UpdateValueMetric(input) {
      const metric = await store.metrics.getById(input.metricId);
      if (!metric) throw new Error(`Metric not found: ${input.metricId}`);
      const updated = metric.update({
        valueType: input.valueType,
        source: input.source,
        numericValue: input.numericValue,
        moneyAmount: input.moneyAmount,
        currency: input.currency,
        confidence: input.confidence,
        period: input.period,
      });
      if (!updated.ok) throw new Error(updated.error.message);
      await store.metrics.save(updated.value);
      return updated.value;
    },

    async CreateValueMilestone(input) {
      await requireProfile(input.ventureId);
      const m = ValueMilestone.create({
        id: input.id,
        ventureId: asVentureId(input.ventureId),
        name: input.name,
        target: input.target,
        unit: input.unit,
        current: input.current,
        dueDate: input.dueDate as never,
        evidenceRequirements: input.evidenceRequirements,
        owner: input.owner,
        costToMilestone: input.costToMilestone,
      });
      if (!m.ok) throw new Error(m.error.message);
      await store.milestones.save(m.value);
      return m.value;
    },

    async StartValueExperiment(input) {
      await requireProfile(input.ventureId);
      const created = ValueExperiment.create({
        id: input.id,
        ventureId: asVentureId(input.ventureId),
        type: input.type,
        hypothesisStatement: input.hypothesisStatement,
        audience: input.audience,
        method: input.method,
        successCriteria: input.successCriteria,
        failureCriteria: input.failureCriteria,
        durationDays: input.durationDays,
      });
      if (!created.ok) throw new Error(created.error.message);
      const started = created.value.start();
      if (!started.ok) throw new Error(started.error.message);
      await store.experiments.save(started.value);
      return started.value;
    },

    async CompleteValueExperiment(input) {
      const exp = await store.experiments.getById(input.experimentId);
      if (!exp) throw new Error(`Experiment not found: ${input.experimentId}`);
      if (input.invalidate) {
        const inv = exp.invalidate(input.invalidate.reason);
        if (!inv.ok) throw new Error(inv.error.message);
        await store.experiments.save(inv.value);
        return inv.value;
      }
      const done = exp.complete({
        result: input.result,
        learning: input.learning,
        nextAction: input.nextAction,
        evidenceIds: input.evidenceIds as never,
      });
      if (!done.ok) throw new Error(done.error.message);
      await store.experiments.save(done.value);
      return done.value;
    },

    async CreateValueAssessment(input) {
      await requireProfile(input.ventureId);
      const evidence = await store.evidence.listByVenture(input.ventureId);
      const hypotheses = await store.hypotheses.listByVenture(input.ventureId);
      const metrics = await store.metrics.listByVenture(input.ventureId);
      const risks = await store.risks.listByVenture(input.ventureId);
      const opportunities = await store.opportunities.listByVenture(input.ventureId);
      const stage =
        input.stage ?? deriveStageFromEvidence(evidence, metrics);
      const assessment = assessVentureValue({
        assessmentId: input.id,
        ventureId: asVentureId(input.ventureId),
        stage,
        evidence,
        hypotheses,
        metrics,
        risks,
        opportunities,
        includeOptionalScore: input.includeOptionalScore,
      });
      await store.assessments.save(assessment);
      return assessment;
    },

    async CreateValueSnapshot(input) {
      await requireProfile(input.ventureId);
      const evidence = await store.evidence.listByVenture(input.ventureId);
      const metrics = await store.metrics.listByVenture(input.ventureId);
      const risks = await store.risks.listByVenture(input.ventureId);
      const milestones = await store.milestones.listByVenture(input.ventureId);
      const recommendations = await store.recommendations.listByVenture(input.ventureId);
      const economics = await store.economics.getByVenture(input.ventureId);
      let assessments = await store.assessments.listByVenture(input.ventureId);
      if (!assessments.length) {
        const a = await this.CreateValueAssessment({
          id: `assess-snap-${input.id}`,
          ventureId: input.ventureId,
        });
        assessments = [a];
      }
      const latest = assessments[assessments.length - 1]!;
      const nextMilestone =
        milestones.find((m) => m.props.status !== "COMPLETED" && m.props.status !== "CANCELLED") ??
        undefined;
      const conf = Confidence(Number(latest.props.overallConfidence));
      if (!conf.ok) throw new Error(conf.error.message);
      const snap = ValueSnapshot.create({
        id: input.id,
        ventureId: asVentureId(input.ventureId),
        stage: latest.props.stage,
        dimensions: latest.props.dimensions,
        metrics: metrics.map((m) => m.toSnapshot()),
        evidence: evidence.map((e) => e.toSnapshot()),
        economics: economics?.toSnapshot(),
        risks: risks.map((r) => r.toSnapshot()),
        nextMilestone: nextMilestone?.toSnapshot(),
        recommendation: recommendations[recommendations.length - 1]?.toSnapshot(),
        confidence: conf.value,
        timestamp: nowTimestamp(),
      });
      await store.snapshots.save(snap);
      return snap;
    },

    async RequestValueReview(input) {
      await requireProfile(input.ventureId);
      const assessment = await this.CreateValueAssessment({
        id: `assess-review-${input.ventureId}-${Date.now()}`,
        ventureId: input.ventureId,
        includeOptionalScore: true,
      });
      const evidence = await store.evidence.listByVenture(input.ventureId);
      const milestones = await store.milestones.listByVenture(input.ventureId);
      const recs = generateValueRecommendations({
        ventureId: asVentureId(input.ventureId),
        assessment,
        evidence,
        milestones,
      });
      for (const r of recs) {
        // Ensure irreversible ones stay pending — never execute
        if (r.props.requiresApproval) {
          const gate = assertNoAutomaticIrreversibleExecution(r);
          if (gate.allowed) {
            throw new Error("Invariant violated: irreversible recommendation marked auto-executable");
          }
        }
        await store.recommendations.save(r);
      }
      return {
        assessmentId: String(assessment.id),
        recommendationIds: recs.map((r) => String(r.id)),
      };
    },

    async ApproveValueRecommendation(input) {
      const rec = await store.recommendations.getById(input.recommendationId);
      if (!rec) throw new Error(`Recommendation not found: ${input.recommendationId}`);
      const approved = rec.approve(input.note);
      if (!approved.ok) throw new Error(approved.error.message);
      await store.recommendations.save(approved.value);
      // CRITICAL: approval does not auto-execute PAUSE/PIVOT/MERGE/CLOSE
      return { approved: true as const, autoExecuted: false as const };
    },

    async RejectValueRecommendation(input) {
      const rec = await store.recommendations.getById(input.recommendationId);
      if (!rec) throw new Error(`Recommendation not found: ${input.recommendationId}`);
      const rejected = rec.reject(input.note);
      if (!rejected.ok) throw new Error(rejected.error.message);
      await store.recommendations.save(rejected.value);
      return { rejected: true as const };
    },

    async GetVentureValueSummary(ventureId) {
      const profile = await requireProfile(ventureId);
      const evidence = await store.evidence.listByVenture(ventureId);
      const metrics = await store.metrics.listByVenture(ventureId);
      const milestones = await store.milestones.listByVenture(ventureId);
      const assessments = await store.assessments.listByVenture(ventureId);
      const recommendations = await store.recommendations.listByVenture(ventureId);
      const economics = await store.economics.getByVenture(ventureId);
      const latest = assessments[assessments.length - 1];
      return {
        ventureId,
        name: profile.name,
        currency: profile.currency,
        stage: latest?.props.stage ?? profile.stage,
        evidenceCount: evidence.length,
        metricCount: metrics.length,
        milestoneCount: milestones.length,
        confidence: latest ? Number(latest.props.overallConfidence) : 0,
        hasActualRevenue: economics?.props.actualRevenue?.valueType === "ACTUAL",
        pendingApprovals: recommendations.filter((r) => r.props.approvalStatus === "PENDING_APPROVAL")
          .length,
        uncertaintyDisplayed: true,
      };
    },

    async GetVentureValueDetail(ventureId) {
      const summary = await this.GetVentureValueSummary(ventureId);
      return {
        ...summary,
        hypotheses: (await store.hypotheses.listByVenture(ventureId)).map((h) => h.toSnapshot()),
        evidence: (await store.evidence.listByVenture(ventureId)).map((e) => e.toSnapshot()),
        metrics: (await store.metrics.listByVenture(ventureId)).map((m) => m.toSnapshot()),
        milestones: (await store.milestones.listByVenture(ventureId)).map((m) => m.toSnapshot()),
        experiments: (await store.experiments.listByVenture(ventureId)).map((e) => e.toSnapshot()),
        assessments: (await store.assessments.listByVenture(ventureId)).map((a) => a.toSnapshot()),
        recommendations: (await store.recommendations.listByVenture(ventureId)).map((r) =>
          r.toSnapshot()
        ),
        risks: (await store.risks.listByVenture(ventureId)).map((r) => r.toSnapshot()),
        opportunities: (await store.opportunities.listByVenture(ventureId)).map((o) =>
          o.toSnapshot()
        ),
        economics: (await store.economics.getByVenture(ventureId))?.toSnapshot() ?? null,
        snapshots: (await store.snapshots.listByVenture(ventureId)).map((s) => s.toSnapshot()),
      };
    },

    async GetValueEvidence(ventureId) {
      return (await store.evidence.listByVenture(ventureId)).map((e) => e.toSnapshot());
    },
    async GetValueMilestones(ventureId) {
      return (await store.milestones.listByVenture(ventureId)).map((m) => m.toSnapshot());
    },
    async GetValueExperiments(ventureId) {
      return (await store.experiments.listByVenture(ventureId)).map((e) => e.toSnapshot());
    },
    async GetVentureEconomics(ventureId) {
      return (await store.economics.getByVenture(ventureId))?.toSnapshot() ?? null;
    },
    async GetValueRecommendations(ventureId) {
      return (await store.recommendations.listByVenture(ventureId)).map((r) => r.toSnapshot());
    },

    async ComparePortfolioVentures(ventureIds) {
      const inputs = [];
      for (const ventureId of ventureIds) {
        const profile = await requireProfile(ventureId);
        let assessments = await store.assessments.listByVenture(ventureId);
        if (!assessments.length) {
          assessments = [
            await this.CreateValueAssessment({ id: `assess-cmp-${ventureId}`, ventureId }),
          ];
        }
        const evidence = await store.evidence.listByVenture(ventureId);
        const milestones = await store.milestones.listByVenture(ventureId);
        const economics = await store.economics.getByVenture(ventureId);
        inputs.push({
          ventureId,
          ventureName: profile.name,
          assessment: assessments[assessments.length - 1]!,
          evidenceCount: evidence.length,
          economics,
          nextMilestone:
            milestones.find(
              (m) => m.props.status !== "COMPLETED" && m.props.status !== "CANCELLED"
            ) ?? null,
        });
      }
      return comparePortfolioVentures(inputs);
    },

    async GetPortfolioValueSummary(portfolioId, ventureIds) {
      const cmp = await this.ComparePortfolioVentures(ventureIds);
      const inputs = [];
      for (const row of cmp.rows) {
        const assessments = await store.assessments.listByVenture(row.ventureId);
        const economics = await store.economics.getByVenture(row.ventureId);
        inputs.push({
          ventureId: row.ventureId,
          ventureName: row.ventureName,
          assessment: assessments[assessments.length - 1]!,
          evidenceCount: row.evidenceCount,
          economics,
          nextMilestone: null,
        });
      }
      return summarizePortfolioValue(portfolioId, inputs);
    },
  };
}
