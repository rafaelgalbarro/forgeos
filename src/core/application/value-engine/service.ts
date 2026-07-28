/**
 * PROGRAM 6120 — Value Engine application service.
 * Implements explicit commands/queries with transparent evaluation.
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
  type MetricValueType,
  type ValueAssessment,
  type ValueDimension,
  type ValueEngineRepository,
  type ValueMetricKind,
  type ValueRecommendation,
  type ValueStage,
  type VentureId,
} from "@/src/core/domain";
import { assessVentureValue, deriveStageFromEvidence } from "./assessment-engine";
import { comparePortfolioVentures, summarizePortfolioValue } from "./portfolio";
import {
  assertNoAutomaticIrreversibleExecution,
  generateValueRecommendations,
} from "./recommendation-engine";

export type ValueCommandResult<T> = Readonly<{ ok: true; data: T }> | Readonly<{ ok: false; error: string }>;

export type VentureCatalog = Readonly<{
  listVentures(): Promise<Array<{ id: string; name: string; currency?: string }>>;
  getVenture(ventureId: string): Promise<{ id: string; name: string; currency?: string } | null>;
}>;

function fail<T>(error: string): ValueCommandResult<T> {
  return { ok: false, error };
}

function ok<T>(data: T): ValueCommandResult<T> {
  return { ok: true, data };
}

function parseVentureId(ventureId: string): VentureId {
  return asVentureId(ventureId);
}

export class ValueEngineService {
  constructor(
    private readonly repo: ValueEngineRepository,
    private readonly ventures: VentureCatalog,
    private readonly createId: (prefix: string) => string = (p) => `${p}-${Date.now()}`
  ) {}

  async createValueHypothesis(input: {
    ventureId: string;
    statement: string;
    dimension: ValueDimension;
    assumptions?: readonly string[];
    invalidationCriteria?: readonly string[];
    confidence?: number;
  }): Promise<ValueCommandResult<ValueHypothesis>> {
    const result = ValueHypothesis.create({
      id: this.createId("vh"),
      ventureId: parseVentureId(input.ventureId),
      statement: input.statement,
      dimension: input.dimension,
      assumptions: input.assumptions,
      invalidationCriteria: input.invalidationCriteria,
      confidence: input.confidence,
    });
    if (!result.ok) return fail(result.error.message);
    await this.repo.hypotheses.save(result.value);
    return ok(result.value);
  }

  async registerValueEvidence(input: {
    ventureId: string;
    type: Parameters<typeof ValueEvidence.create>[0]["type"];
    source: string;
    provenance: string;
    summary: string;
    relatedHypothesisId?: string;
    affectedMetricId?: string;
    attachmentRef?: string;
    artifactRef?: string;
  }): Promise<ValueCommandResult<ValueEvidence>> {
    const result = ValueEvidence.create({
      id: this.createId("ve"),
      ventureId: parseVentureId(input.ventureId),
      type: input.type,
      source: input.source,
      provenance: input.provenance,
      summary: input.summary,
      relatedHypothesisId: input.relatedHypothesisId as never,
      affectedMetricId: input.affectedMetricId as never,
      attachmentRef: input.attachmentRef,
      artifactRef: input.artifactRef,
    });
    if (!result.ok) return fail(result.error.message);
    await this.repo.evidence.save(result.value);
    return ok(result.value);
  }

  async createValueMetric(input: {
    ventureId: string;
    kind: ValueMetricKind;
    label: string;
    numericValue?: number;
    moneyAmount?: number;
    currency?: string;
    unit?: string;
    valueType: MetricValueType;
    source: string;
    confidence?: number;
    period?: string;
  }): Promise<ValueCommandResult<ValueMetric>> {
    const result = ValueMetric.create({
      id: this.createId("vm"),
      ventureId: parseVentureId(input.ventureId),
      kind: input.kind,
      label: input.label,
      numericValue: input.numericValue,
      moneyAmount: input.moneyAmount,
      currency: input.currency,
      unit: input.unit,
      valueType: input.valueType,
      source: input.source,
      confidence: input.confidence,
      period: input.period,
    });
    if (!result.ok) return fail(result.error.message);
    await this.repo.metrics.save(result.value);
    return ok(result.value);
  }

  async updateValueMetric(input: {
    metricId: string;
    numericValue?: number;
    moneyAmount?: number;
    currency?: string;
    valueType: MetricValueType;
    source: string;
    confidence?: number;
    period?: string;
  }): Promise<ValueCommandResult<ValueMetric>> {
    const metric = await this.repo.metrics.getById(input.metricId);
    if (!metric) return fail(`Metric not found: ${input.metricId}`);
    const updated = metric.update(input);
    if (!updated.ok) return fail(updated.error.message);
    await this.repo.metrics.save(updated.value);
    return ok(updated.value);
  }

  async createValueMilestone(input: {
    ventureId: string;
    name: string;
    target: number;
    current?: number;
    unit: string;
    evidenceRequirements?: readonly string[];
    owner?: string;
  }): Promise<ValueCommandResult<ValueMilestone>> {
    const result = ValueMilestone.create({
      id: this.createId("vms"),
      ventureId: parseVentureId(input.ventureId),
      name: input.name,
      target: input.target,
      current: input.current,
      unit: input.unit,
      evidenceRequirements: input.evidenceRequirements,
      owner: input.owner,
    });
    if (!result.ok) return fail(result.error.message);
    await this.repo.milestones.save(result.value);
    return ok(result.value);
  }

  async startValueExperiment(input: {
    ventureId: string;
    type: Parameters<typeof ValueExperiment.create>[0]["type"];
    hypothesisStatement: string;
    audience: string;
    method: string;
    successCriteria: readonly string[];
    failureCriteria: readonly string[];
  }): Promise<ValueCommandResult<ValueExperiment>> {
    const created = ValueExperiment.create({
      id: this.createId("vexp"),
      ventureId: parseVentureId(input.ventureId),
      type: input.type,
      hypothesisStatement: input.hypothesisStatement,
      audience: input.audience,
      method: input.method,
      successCriteria: input.successCriteria,
      failureCriteria: input.failureCriteria,
    });
    if (!created.ok) return fail(created.error.message);
    const started = created.value.start();
    if (!started.ok) return fail(started.error.message);
    await this.repo.experiments.save(started.value);
    return ok(started.value);
  }

  async completeValueExperiment(input: {
    experimentId: string;
    result?: string;
    learning?: string;
    nextAction?: string;
    invalidReason?: string;
    evidenceIds?: readonly string[];
  }): Promise<ValueCommandResult<ValueExperiment>> {
    const exp = await this.repo.experiments.getById(input.experimentId);
    if (!exp) return fail(`Experiment not found: ${input.experimentId}`);
    if (input.invalidReason) {
      const invalid = exp.invalidate(input.invalidReason);
      if (!invalid.ok) return fail(invalid.error.message);
      await this.repo.experiments.save(invalid.value);
      return ok(invalid.value);
    }
    const done = exp.complete({
      result: input.result ?? "",
      learning: input.learning ?? "",
      nextAction: input.nextAction ?? "",
      evidenceIds: input.evidenceIds as never,
    });
    if (!done.ok) return fail(done.error.message);
    await this.repo.experiments.save(done.value);
    return ok(done.value);
  }

  async createValueAssessment(input: {
    ventureId: string;
    stage?: ValueStage;
    includeOptionalScore?: boolean;
  }): Promise<ValueCommandResult<ValueAssessment>> {
    const ventureId = parseVentureId(input.ventureId);
    const evidence = await this.repo.evidence.listByVenture(ventureId);
    const metrics = await this.repo.metrics.listByVenture(ventureId);
    const hypotheses = await this.repo.hypotheses.listByVenture(ventureId);
    const risks = await this.repo.risks.listByVenture(ventureId);
    const opportunities = await this.repo.opportunities.listByVenture(ventureId);
    const stage = input.stage ?? deriveStageFromEvidence(evidence, metrics);
    const assessment = assessVentureValue({
      assessmentId: this.createId("va"),
      ventureId,
      stage,
      evidence,
      hypotheses,
      metrics,
      risks,
      opportunities,
      includeOptionalScore: input.includeOptionalScore,
    });
    await this.repo.assessments.save(assessment);
    return ok(assessment);
  }

  async createValueSnapshot(input: {
    ventureId: string;
    recommendationId?: string;
  }): Promise<ValueCommandResult<ValueSnapshot>> {
    const ventureId = parseVentureId(input.ventureId);
    const assessments = await this.repo.assessments.listByVenture(ventureId);
    const latestAssessment = assessments.sort((a, b) => String(b.props.createdAt).localeCompare(String(a.props.createdAt)))[0];
    if (!latestAssessment) return fail("Assessment required before snapshot");
    const metrics = await this.repo.metrics.listByVenture(ventureId);
    const evidence = await this.repo.evidence.listByVenture(ventureId);
    const risks = await this.repo.risks.listByVenture(ventureId);
    const milestones = await this.repo.milestones.listByVenture(ventureId);
    const economics = await this.repo.economics.getByVenture(ventureId);
    const rec = input.recommendationId
      ? await this.repo.recommendations.getById(input.recommendationId)
      : null;
    const nextMilestone = milestones
      .filter((m) => m.props.status !== "COMPLETED" && m.props.status !== "CANCELLED")
      .sort((a, b) => a.props.target - b.props.target)[0];
    const snap = ValueSnapshot.create({
      id: this.createId("vs"),
      ventureId,
      stage: latestAssessment.props.stage,
      dimensions: latestAssessment.props.dimensions,
      metrics: metrics.map((m) => m.toSnapshot()),
      evidence: evidence.map((e) => e.toSnapshot()),
      economics: economics?.toSnapshot(),
      risks: risks.map((r) => r.toSnapshot()),
      nextMilestone: nextMilestone?.toSnapshot(),
      recommendation: rec?.toSnapshot(),
      confidence: latestAssessment.props.overallConfidence,
      timestamp: latestAssessment.props.createdAt,
    });
    await this.repo.snapshots.save(snap);
    return ok(snap);
  }

  async requestValueReview(input: { ventureId: string }): Promise<ValueCommandResult<ValueRecommendation[]>> {
    const ventureId = parseVentureId(input.ventureId);
    const assessments = await this.repo.assessments.listByVenture(ventureId);
    const assessment = assessments.sort((a, b) => String(b.props.createdAt).localeCompare(String(a.props.createdAt)))[0];
    if (!assessment) return fail("Assessment required before recommendations");
    const evidence = await this.repo.evidence.listByVenture(ventureId);
    const milestones = await this.repo.milestones.listByVenture(ventureId);
    const recs = generateValueRecommendations({
      ventureId,
      assessment,
      evidence,
      milestones,
      recommendationIdPrefix: this.createId("vrev"),
    });
    for (const rec of recs) {
      await this.repo.recommendations.save(rec);
    }
    return ok(recs);
  }

  async approveValueRecommendation(input: {
    recommendationId: string;
    note?: string;
  }): Promise<ValueCommandResult<ValueRecommendation>> {
    const rec = await this.repo.recommendations.getById(input.recommendationId);
    if (!rec) return fail(`Recommendation not found: ${input.recommendationId}`);
    const approved = rec.approve(input.note);
    if (!approved.ok) return fail(approved.error.message);
    await this.repo.recommendations.save(approved.value);
    return ok(approved.value);
  }

  async rejectValueRecommendation(input: {
    recommendationId: string;
    note: string;
  }): Promise<ValueCommandResult<ValueRecommendation>> {
    const rec = await this.repo.recommendations.getById(input.recommendationId);
    if (!rec) return fail(`Recommendation not found: ${input.recommendationId}`);
    const rejected = rec.reject(input.note);
    if (!rejected.ok) return fail(rejected.error.message);
    await this.repo.recommendations.save(rejected.value);
    return ok(rejected.value);
  }

  async upsertVentureEconomics(input: {
    ventureId: string;
    currency: string;
    actualRevenueAmount?: number;
    actualRevenueType?: MetricValueType;
    projectedRevenueAmount?: number;
    projectedRevenueType?: MetricValueType;
    operatingCostAmount?: number;
    operatingCostType?: MetricValueType;
    source: string;
    period?: string;
  }): Promise<ValueCommandResult<VentureEconomics>> {
    const ventureId = parseVentureId(input.ventureId);
    const existing = await this.repo.economics.getByVenture(ventureId);
    const base =
      existing ??
      (() => {
        const created = VentureEconomics.create({
          id: this.createId("vec"),
          ventureId,
          currency: input.currency,
        });
        if (!created.ok) throw new Error(created.error.message);
        return created.value;
      })();
    let updated = base;
    const typedMoney = (amount: number | undefined, valueType: MetricValueType | undefined) => {
      if (amount === undefined) return undefined;
      return {
        money: { amount, currency: base.props.currency },
        period: input.period,
        source: input.source,
        valueType: valueType ?? "ESTIMATED",
        confidence: (valueType ?? "ESTIMATED") === "ACTUAL" ? 0.9 : 0.5,
        updatedAt: new Date().toISOString() as never,
      };
    };
    const actualRevenue = typedMoney(input.actualRevenueAmount, input.actualRevenueType);
    if (actualRevenue) {
      const next = updated.withField("actualRevenue", actualRevenue as never);
      if (!next.ok) return fail(next.error.message);
      updated = next.value;
    }
    const projectedRevenue = typedMoney(input.projectedRevenueAmount, input.projectedRevenueType);
    if (projectedRevenue) {
      const next = updated.withField("projectedRevenue", projectedRevenue as never);
      if (!next.ok) return fail(next.error.message);
      updated = next.value;
    }
    const operatingCost = typedMoney(input.operatingCostAmount, input.operatingCostType);
    if (operatingCost) {
      const next = updated.withField("operatingCost", operatingCost as never);
      if (!next.ok) return fail(next.error.message);
      updated = next.value;
    }
    await this.repo.economics.save(updated);
    return ok(updated);
  }

  // Queries
  async getVentureValueSummary(ventureId: string) {
    const venture = await this.ventures.getVenture(ventureId);
    if (!venture) return null;
    const id = parseVentureId(ventureId);
    const assessments = await this.repo.assessments.listByVenture(id);
    const latest = assessments.sort((a, b) => String(b.props.createdAt).localeCompare(String(a.props.createdAt)))[0];
    const evidence = await this.repo.evidence.listByVenture(id);
    const milestones = await this.repo.milestones.listByVenture(id);
    const recs = await this.repo.recommendations.listByVenture(id);
    return {
      ventureId: venture.id,
      ventureName: venture.name,
      stage: latest?.props.stage ?? "IDEA_VALUE",
      confidence: Number(latest?.props.overallConfidence ?? 0),
      evidenceCount: evidence.length,
      milestoneCompletion: {
        completed: milestones.filter((m) => m.props.status === "COMPLETED").length,
        total: milestones.length,
      },
      recommendations: recs.map((r) => ({
        id: String(r.id),
        type: r.props.type,
        requiresApproval: r.props.requiresApproval,
        approvalStatus: r.props.approvalStatus,
      })),
      notes: [
        "No invented revenue/customers",
        "ACTUAL vs ESTIMATED/PROJECTED preserved in metrics/economics",
      ],
    };
  }

  async getVentureValueDetail(ventureId: string) {
    const venture = await this.ventures.getVenture(ventureId);
    if (!venture) return null;
    const id = parseVentureId(ventureId);
    return {
      venture,
      hypotheses: (await this.repo.hypotheses.listByVenture(id)).map((x) => x.toSnapshot()),
      evidence: (await this.repo.evidence.listByVenture(id)).map((x) => x.toSnapshot()),
      metrics: (await this.repo.metrics.listByVenture(id)).map((x) => x.toSnapshot()),
      milestones: (await this.repo.milestones.listByVenture(id)).map((x) => x.toSnapshot()),
      experiments: (await this.repo.experiments.listByVenture(id)).map((x) => x.toSnapshot()),
      assessments: (await this.repo.assessments.listByVenture(id)).map((x) => x.toSnapshot()),
      recommendations: (await this.repo.recommendations.listByVenture(id)).map((x) => ({
        ...x.toSnapshot(),
        autoExecutionGate: assertNoAutomaticIrreversibleExecution(x),
      })),
      economics: (await this.repo.economics.getByVenture(id))?.toSnapshot() ?? null,
      snapshots: (await this.repo.snapshots.listByVenture(id)).map((x) => x.toSnapshot()),
    };
  }

  async getValueEvidence(ventureId: string) {
    return (await this.repo.evidence.listByVenture(parseVentureId(ventureId))).map((x) => x.toSnapshot());
  }
  async getValueMilestones(ventureId: string) {
    return (await this.repo.milestones.listByVenture(parseVentureId(ventureId))).map((x) => x.toSnapshot());
  }
  async getValueExperiments(ventureId: string) {
    return (await this.repo.experiments.listByVenture(parseVentureId(ventureId))).map((x) => x.toSnapshot());
  }
  async getVentureEconomics(ventureId: string) {
    return (await this.repo.economics.getByVenture(parseVentureId(ventureId)))?.toSnapshot() ?? null;
  }
  async getValueRecommendations(ventureId: string) {
    return (await this.repo.recommendations.listByVenture(parseVentureId(ventureId))).map((x) => ({
      ...x.toSnapshot(),
      autoExecutionGate: assertNoAutomaticIrreversibleExecution(x),
    }));
  }

  async comparePortfolioVentures() {
    const ventures = await this.ventures.listVentures();
    const rows = [];
    for (const v of ventures) {
      const id = parseVentureId(v.id);
      const assessments = await this.repo.assessments.listByVenture(id);
      const latest = assessments.sort((a, b) => String(b.props.createdAt).localeCompare(String(a.props.createdAt)))[0];
      if (!latest) continue;
      rows.push({
        ventureId: v.id,
        ventureName: v.name,
        assessment: latest,
        evidenceCount: (await this.repo.evidence.listByVenture(id)).length,
        economics: await this.repo.economics.getByVenture(id),
        nextMilestone:
          (await this.repo.milestones.listByVenture(id)).find((m) => m.props.status !== "COMPLETED") ??
          null,
      });
    }
    return comparePortfolioVentures(rows);
  }

  async getPortfolioValueSummary(portfolioId: string) {
    const ventures = await this.ventures.listVentures();
    const rows = [];
    for (const v of ventures) {
      const id = parseVentureId(v.id);
      const assessments = await this.repo.assessments.listByVenture(id);
      const latest = assessments.sort((a, b) => String(b.props.createdAt).localeCompare(String(a.props.createdAt)))[0];
      if (!latest) continue;
      rows.push({
        ventureId: v.id,
        ventureName: v.name,
        assessment: latest,
        evidenceCount: (await this.repo.evidence.listByVenture(id)).length,
        economics: await this.repo.economics.getByVenture(id),
        nextMilestone:
          (await this.repo.milestones.listByVenture(id)).find((m) => m.props.status !== "COMPLETED") ??
          null,
      });
    }
    return summarizePortfolioValue(portfolioId, rows);
  }
}

