/**
 * Value domain entities — PROGRAM 6120.
 * Linked to VentureId; do not duplicate Venture/Mission aggregates.
 */

import type { VentureId } from "../shared/ids";
import { DomainError } from "../shared/errors";
import { err, ok, type Result } from "../shared/result";
import {
  Confidence,
  CURRENT_SCHEMA_VERSION,
  Money,
  nowTimestamp,
  type Confidence as ConfidenceType,
  type IsoTimestamp,
  type Money as MoneyType,
  type SchemaVersion,
} from "../shared/value-objects";
import {
  asCustomerEvidenceId,
  asValueAssessmentId,
  asValueEvidenceId,
  asValueExperimentId,
  asValueHypothesisId,
  asValueMetricId,
  asValueMilestoneId,
  asValueOpportunityId,
  asValueRecommendationId,
  asValueRiskId,
  asValueSnapshotId,
  asVentureEconomicsId,
  asVentureTractionId,
  type CustomerEvidenceId,
  type ValueAssessmentId,
  type ValueEvidenceId,
  type ValueExperimentId,
  type ValueHypothesisId,
  type ValueMetricId,
  type ValueMilestoneId,
  type ValueOpportunityId,
  type ValueRecommendationId,
  type ValueRiskId,
  type ValueSnapshotId,
  type VentureEconomicsId,
  type VentureTractionId,
} from "./ids";
import type {
  DimensionAssessment,
  EvidenceDerivation,
  EvidenceReliability,
  EvidenceType,
  EvidenceVerificationStatus,
  ExperimentState,
  ExperimentType,
  MetricValueType,
  MilestoneStatus,
  OpportunityMagnitude,
  RecommendationApprovalStatus,
  RecommendationType,
  RiskSeverity,
  TypedMoneyValue,
  ValueDimension,
  ValueDimensionState,
  ValueMetricKind,
  ValueStage,
} from "./types";
import { REQUIRES_APPROVAL_RECOMMENDATIONS } from "./types";

// ─── ValueHypothesis ─────────────────────────────────────────────────────────

export type ValueHypothesisProps = Readonly<{
  id: ValueHypothesisId;
  ventureId: VentureId;
  statement: string;
  dimension: ValueDimension;
  status: ValueDimensionState;
  assumptions: readonly string[];
  invalidationCriteria: readonly string[];
  relatedEvidenceIds: readonly ValueEvidenceId[];
  confidence: ConfidenceType;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueHypothesis {
  private constructor(readonly props: ValueHypothesisProps) {}
  get id(): ValueHypothesisId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    statement: string;
    dimension: ValueDimension;
    assumptions?: readonly string[];
    invalidationCriteria?: readonly string[];
    confidence?: number;
    now?: IsoTimestamp;
  }): Result<ValueHypothesis, DomainError> {
    const statement = input.statement.trim();
    if (!statement) return err(DomainError.invariant("ValueHypothesis", "statement required"));
    const conf = Confidence(input.confidence ?? 0.2);
    if (!conf.ok) return err(conf.error);
    const ts = input.now ?? nowTimestamp();
    return ok(
      new ValueHypothesis({
        id: asValueHypothesisId(input.id),
        ventureId: input.ventureId,
        statement,
        dimension: input.dimension,
        status: "HYPOTHESIS",
        assumptions: input.assumptions ?? [],
        invalidationCriteria: input.invalidationCriteria ?? [],
        relatedEvidenceIds: [],
        confidence: conf.value,
        createdAt: ts,
        updatedAt: ts,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueHypothesisProps): ValueHypothesis {
    return new ValueHypothesis(props);
  }
  linkEvidence(evidenceId: ValueEvidenceId, now: IsoTimestamp = nowTimestamp()): ValueHypothesis {
    if (this.props.relatedEvidenceIds.includes(evidenceId)) return this;
    return new ValueHypothesis({
      ...this.props,
      relatedEvidenceIds: [...this.props.relatedEvidenceIds, evidenceId],
      updatedAt: now,
    });
  }
  toSnapshot(): ValueHypothesisProps {
    return this.props;
  }
}

// ─── ValueEvidence ───────────────────────────────────────────────────────────

export type ValueEvidenceProps = Readonly<{
  id: ValueEvidenceId;
  ventureId: VentureId;
  type: EvidenceType;
  /** Origin — required; no evidence without origin. */
  source: string;
  observedAt: IsoTimestamp;
  reliability: EvidenceReliability;
  derivation: EvidenceDerivation;
  relatedHypothesisId?: ValueHypothesisId;
  affectedMetricId?: ValueMetricId;
  provenance: string;
  attachmentRef?: string;
  artifactRef?: string;
  verificationStatus: EvidenceVerificationStatus;
  summary: string;
  createdAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueEvidence {
  private constructor(readonly props: ValueEvidenceProps) {}
  get id(): ValueEvidenceId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    type: EvidenceType;
    source: string;
    observedAt?: IsoTimestamp;
    reliability?: EvidenceReliability;
    derivation?: EvidenceDerivation;
    relatedHypothesisId?: ValueHypothesisId;
    affectedMetricId?: ValueMetricId;
    provenance: string;
    attachmentRef?: string;
    artifactRef?: string;
    summary: string;
    now?: IsoTimestamp;
  }): Result<ValueEvidence, DomainError> {
    const source = input.source.trim();
    const provenance = input.provenance.trim();
    const summary = input.summary.trim();
    if (!source) return err(DomainError.invariant("ValueEvidence", "source (origin) required"));
    if (!provenance) return err(DomainError.invariant("ValueEvidence", "provenance required"));
    if (!summary) return err(DomainError.invariant("ValueEvidence", "summary required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new ValueEvidence({
        id: asValueEvidenceId(input.id),
        ventureId: input.ventureId,
        type: input.type,
        source,
        observedAt: input.observedAt ?? ts,
        reliability: input.reliability ?? "MEDIUM",
        derivation: input.derivation ?? "DIRECT",
        relatedHypothesisId: input.relatedHypothesisId,
        affectedMetricId: input.affectedMetricId,
        provenance,
        attachmentRef: input.attachmentRef,
        artifactRef: input.artifactRef,
        verificationStatus: "UNVERIFIED",
        summary,
        createdAt: ts,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueEvidenceProps): ValueEvidence {
    return new ValueEvidence(props);
  }
  toSnapshot(): ValueEvidenceProps {
    return this.props;
  }
}

// ─── ValueMetric ─────────────────────────────────────────────────────────────

export type ValueMetricProps = Readonly<{
  id: ValueMetricId;
  ventureId: VentureId;
  kind: ValueMetricKind;
  label: string;
  numericValue?: number;
  moneyValue?: MoneyType;
  unit?: string;
  valueType: MetricValueType;
  source: string;
  confidence: ConfidenceType;
  period?: string;
  evidenceIds: readonly ValueEvidenceId[];
  updatedAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueMetric {
  private constructor(readonly props: ValueMetricProps) {}
  get id(): ValueMetricId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
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
    now?: IsoTimestamp;
  }): Result<ValueMetric, DomainError> {
    const label = input.label.trim();
    const source = input.source.trim();
    if (!label) return err(DomainError.invariant("ValueMetric", "label required"));
    if (!source) return err(DomainError.invariant("ValueMetric", "source required"));
    if (input.valueType === "UNKNOWN" && input.numericValue !== undefined) {
      return err(DomainError.invariant("ValueMetric", "UNKNOWN metrics cannot carry numeric values"));
    }
    let moneyValue: MoneyType | undefined;
    if (input.moneyAmount !== undefined) {
      const m = Money(input.moneyAmount, input.currency ?? "USD");
      if (!m.ok) return err(m.error);
      moneyValue = m.value;
    }
    const conf = Confidence(input.confidence ?? (input.valueType === "ACTUAL" ? 0.9 : 0.4));
    if (!conf.ok) return err(conf.error);
    const ts = input.now ?? nowTimestamp();
    return ok(
      new ValueMetric({
        id: asValueMetricId(input.id),
        ventureId: input.ventureId,
        kind: input.kind,
        label,
        numericValue: input.numericValue,
        moneyValue,
        unit: input.unit,
        valueType: input.valueType,
        source,
        confidence: conf.value,
        period: input.period,
        evidenceIds: [],
        updatedAt: ts,
        createdAt: ts,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueMetricProps): ValueMetric {
    return new ValueMetric(props);
  }
  update(input: {
    numericValue?: number;
    moneyAmount?: number;
    currency?: string;
    valueType: MetricValueType;
    source: string;
    confidence?: number;
    period?: string;
    now?: IsoTimestamp;
  }): Result<ValueMetric, DomainError> {
    if (input.valueType === "UNKNOWN" && input.numericValue !== undefined) {
      return err(DomainError.invariant("ValueMetric", "UNKNOWN metrics cannot carry numeric values"));
    }
    let moneyValue = this.props.moneyValue;
    if (input.moneyAmount !== undefined) {
      const m = Money(input.moneyAmount, input.currency ?? this.props.moneyValue?.currency ?? "USD");
      if (!m.ok) return err(m.error);
      moneyValue = m.value;
    }
    const conf = Confidence(input.confidence ?? this.props.confidence);
    if (!conf.ok) return err(conf.error);
    return ok(
      new ValueMetric({
        ...this.props,
        numericValue: input.numericValue ?? this.props.numericValue,
        moneyValue,
        valueType: input.valueType,
        source: input.source.trim(),
        confidence: conf.value,
        period: input.period ?? this.props.period,
        updatedAt: input.now ?? nowTimestamp(),
      })
    );
  }
  toSnapshot(): ValueMetricProps {
    return this.props;
  }
}

// ─── ValueMilestone ──────────────────────────────────────────────────────────

export type ValueMilestoneProps = Readonly<{
  id: ValueMilestoneId;
  ventureId: VentureId;
  name: string;
  target: number;
  current: number;
  unit: string;
  dueDate?: IsoTimestamp;
  evidenceRequirements: readonly string[];
  evidenceIds: readonly ValueEvidenceId[];
  status: MilestoneStatus;
  confidence: ConfidenceType;
  blocker?: string;
  owner?: string;
  costToMilestone?: TypedMoneyValue;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueMilestone {
  private constructor(readonly props: ValueMilestoneProps) {}
  get id(): ValueMilestoneId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    name: string;
    target: number;
    current?: number;
    unit: string;
    dueDate?: IsoTimestamp;
    evidenceRequirements?: readonly string[];
    confidence?: number;
    owner?: string;
    costToMilestone?: TypedMoneyValue;
    now?: IsoTimestamp;
  }): Result<ValueMilestone, DomainError> {
    const name = input.name.trim();
    if (!name) return err(DomainError.invariant("ValueMilestone", "name required"));
    if (!Number.isFinite(input.target) || input.target <= 0) {
      return err(DomainError.invariant("ValueMilestone", "target must be positive"));
    }
    const conf = Confidence(input.confidence ?? 0.3);
    if (!conf.ok) return err(conf.error);
    const current = input.current ?? 0;
    const ts = input.now ?? nowTimestamp();
    return ok(
      new ValueMilestone({
        id: asValueMilestoneId(input.id),
        ventureId: input.ventureId,
        name,
        target: input.target,
        current,
        unit: input.unit,
        dueDate: input.dueDate,
        evidenceRequirements: input.evidenceRequirements ?? [],
        evidenceIds: [],
        status: current >= input.target ? "COMPLETED" : current > 0 ? "IN_PROGRESS" : "NOT_STARTED",
        confidence: conf.value,
        owner: input.owner,
        costToMilestone: input.costToMilestone,
        createdAt: ts,
        updatedAt: ts,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueMilestoneProps): ValueMilestone {
    return new ValueMilestone(props);
  }
  recordProgress(
    current: number,
    evidenceId: ValueEvidenceId | undefined,
    now: IsoTimestamp = nowTimestamp()
  ): Result<ValueMilestone, DomainError> {
    if (!Number.isFinite(current) || current < 0) {
      return err(DomainError.invariant("ValueMilestone", "current must be >= 0"));
    }
    const completed = current >= this.props.target;
    if (completed && this.props.evidenceRequirements.length > 0) {
      const ids = evidenceId
        ? [...this.props.evidenceIds, evidenceId]
        : this.props.evidenceIds;
      if (ids.length === 0) {
        return err(
          DomainError.invariant(
            "ValueMilestone",
            "cannot complete milestone without required evidence"
          )
        );
      }
    }
    return ok(
      new ValueMilestone({
        ...this.props,
        current,
        evidenceIds: evidenceId
          ? this.props.evidenceIds.includes(evidenceId)
            ? this.props.evidenceIds
            : [...this.props.evidenceIds, evidenceId]
          : this.props.evidenceIds,
        status: completed ? "COMPLETED" : current > 0 ? "IN_PROGRESS" : this.props.status,
        updatedAt: now,
      })
    );
  }
  block(reason: string, now: IsoTimestamp = nowTimestamp()): ValueMilestone {
    return new ValueMilestone({
      ...this.props,
      status: "BLOCKED",
      blocker: reason.trim(),
      updatedAt: now,
    });
  }
  toSnapshot(): ValueMilestoneProps {
    return this.props;
  }
}

// ─── ValueExperiment ─────────────────────────────────────────────────────────

export type ValueExperimentProps = Readonly<{
  id: ValueExperimentId;
  ventureId: VentureId;
  type: ExperimentType;
  state: ExperimentState;
  hypothesisId?: ValueHypothesisId;
  hypothesisStatement: string;
  audience: string;
  method: string;
  budget?: TypedMoneyValue;
  durationDays?: number;
  successCriteria: readonly string[];
  failureCriteria: readonly string[];
  evidenceIds: readonly ValueEvidenceId[];
  result?: string;
  learning?: string;
  nextAction?: string;
  invalidReason?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

const EXPERIMENT_TRANSITIONS: Record<ExperimentState, readonly ExperimentState[]> = {
  DRAFT: ["PLANNED", "CANCELLED"],
  PLANNED: ["RUNNING", "CANCELLED"],
  RUNNING: ["COMPLETED", "INVALID", "CANCELLED"],
  COMPLETED: [],
  INVALID: [],
  CANCELLED: [],
};

export class ValueExperiment {
  private constructor(readonly props: ValueExperimentProps) {}
  get id(): ValueExperimentId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    type: ExperimentType;
    hypothesisStatement: string;
    audience: string;
    method: string;
    hypothesisId?: ValueHypothesisId;
    budget?: TypedMoneyValue;
    durationDays?: number;
    successCriteria: readonly string[];
    failureCriteria: readonly string[];
    now?: IsoTimestamp;
  }): Result<ValueExperiment, DomainError> {
    const hypothesisStatement = input.hypothesisStatement.trim();
    const audience = input.audience.trim();
    const method = input.method.trim();
    if (!hypothesisStatement) {
      return err(DomainError.invariant("ValueExperiment", "hypothesisStatement required"));
    }
    if (!audience) return err(DomainError.invariant("ValueExperiment", "audience required"));
    if (!method) return err(DomainError.invariant("ValueExperiment", "method required"));
    if (!input.successCriteria.length || !input.failureCriteria.length) {
      return err(
        DomainError.invariant("ValueExperiment", "success and failure criteria required")
      );
    }
    const ts = input.now ?? nowTimestamp();
    return ok(
      new ValueExperiment({
        id: asValueExperimentId(input.id),
        ventureId: input.ventureId,
        type: input.type,
        state: "DRAFT",
        hypothesisId: input.hypothesisId,
        hypothesisStatement,
        audience,
        method,
        budget: input.budget,
        durationDays: input.durationDays,
        successCriteria: input.successCriteria,
        failureCriteria: input.failureCriteria,
        evidenceIds: [],
        createdAt: ts,
        updatedAt: ts,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueExperimentProps): ValueExperiment {
    return new ValueExperiment(props);
  }
  transition(to: ExperimentState, now: IsoTimestamp = nowTimestamp()): Result<ValueExperiment, DomainError> {
    if (!EXPERIMENT_TRANSITIONS[this.props.state].includes(to)) {
      return err(DomainError.invalidTransition("ValueExperiment", this.props.state, to));
    }
    return ok(new ValueExperiment({ ...this.props, state: to, updatedAt: now }));
  }
  start(now: IsoTimestamp = nowTimestamp()): Result<ValueExperiment, DomainError> {
    const planned =
      this.props.state === "DRAFT" ? this.transition("PLANNED", now) : ok(this);
    if (!planned.ok) return planned;
    return planned.value.transition("RUNNING", now);
  }
  complete(input: {
    result: string;
    learning: string;
    nextAction: string;
    evidenceIds?: readonly ValueEvidenceId[];
    now?: IsoTimestamp;
  }): Result<ValueExperiment, DomainError> {
    if (this.props.state !== "RUNNING") {
      return err(
        DomainError.invariant("ValueExperiment", "only RUNNING experiments can be completed")
      );
    }
    const result = input.result.trim();
    const learning = input.learning.trim();
    const nextAction = input.nextAction.trim();
    if (!result || !learning || !nextAction) {
      return err(
        DomainError.invariant("ValueExperiment", "result, learning, and nextAction required")
      );
    }
    const ts = input.now ?? nowTimestamp();
    return ok(
      new ValueExperiment({
        ...this.props,
        state: "COMPLETED",
        result,
        learning,
        nextAction,
        evidenceIds: input.evidenceIds
          ? [...this.props.evidenceIds, ...input.evidenceIds]
          : this.props.evidenceIds,
        updatedAt: ts,
        completedAt: ts,
      })
    );
  }
  invalidate(reason: string, now: IsoTimestamp = nowTimestamp()): Result<ValueExperiment, DomainError> {
    if (this.props.state !== "RUNNING" && this.props.state !== "PLANNED") {
      return err(
        DomainError.invariant("ValueExperiment", "can only invalidate PLANNED or RUNNING experiments")
      );
    }
    const invalidReason = reason.trim();
    if (!invalidReason) {
      return err(DomainError.invariant("ValueExperiment", "invalidReason required"));
    }
    return ok(
      new ValueExperiment({
        ...this.props,
        state: "INVALID",
        invalidReason,
        updatedAt: now,
      })
    );
  }
  toSnapshot(): ValueExperimentProps {
    return this.props;
  }
}

// ─── ValueAssessment ─────────────────────────────────────────────────────────

export type ValueAssessmentProps = Readonly<{
  id: ValueAssessmentId;
  ventureId: VentureId;
  stage: ValueStage;
  dimensions: readonly DimensionAssessment[];
  overallConfidence: ConfidenceType;
  /** Explicitly NOT a ranking score — optional composite with full transparency. */
  optionalCompositeScore?: number;
  compositeFormula?: string;
  missingEvidenceSummary: readonly string[];
  createdAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueAssessment {
  private constructor(readonly props: ValueAssessmentProps) {}
  get id(): ValueAssessmentId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    stage: ValueStage;
    dimensions: readonly DimensionAssessment[];
    overallConfidence: number;
    optionalCompositeScore?: number;
    compositeFormula?: string;
    missingEvidenceSummary: readonly string[];
    now?: IsoTimestamp;
  }): Result<ValueAssessment, DomainError> {
    const conf = Confidence(input.overallConfidence);
    if (!conf.ok) return err(conf.error);
    if (input.optionalCompositeScore !== undefined) {
      const ceiling = conf.value * 100;
      if (input.optionalCompositeScore > ceiling + 1e-9) {
        return err(
          DomainError.invariant(
            "ValueAssessment",
            `optional score ${input.optionalCompositeScore} exceeds confidence ceiling ${ceiling}`
          )
        );
      }
      if (!input.compositeFormula?.trim()) {
        return err(
          DomainError.invariant("ValueAssessment", "compositeFormula required when score is used")
        );
      }
    }
    return ok(
      new ValueAssessment({
        id: asValueAssessmentId(input.id),
        ventureId: input.ventureId,
        stage: input.stage,
        dimensions: input.dimensions,
        overallConfidence: conf.value,
        optionalCompositeScore: input.optionalCompositeScore,
        compositeFormula: input.compositeFormula,
        missingEvidenceSummary: input.missingEvidenceSummary,
        createdAt: input.now ?? nowTimestamp(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueAssessmentProps): ValueAssessment {
    return new ValueAssessment(props);
  }
  toSnapshot(): ValueAssessmentProps {
    return this.props;
  }
}

// ─── ValueRisk / ValueOpportunity ────────────────────────────────────────────

export type ValueRiskProps = Readonly<{
  id: ValueRiskId;
  ventureId: VentureId;
  title: string;
  description: string;
  severity: RiskSeverity;
  dimension?: ValueDimension;
  evidenceIds: readonly ValueEvidenceId[];
  mitigation?: string;
  createdAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueRisk {
  private constructor(readonly props: ValueRiskProps) {}
  get id(): ValueRiskId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    title: string;
    description: string;
    severity: RiskSeverity;
    dimension?: ValueDimension;
    mitigation?: string;
    now?: IsoTimestamp;
  }): Result<ValueRisk, DomainError> {
    const title = input.title.trim();
    if (!title) return err(DomainError.invariant("ValueRisk", "title required"));
    return ok(
      new ValueRisk({
        id: asValueRiskId(input.id),
        ventureId: input.ventureId,
        title,
        description: input.description.trim(),
        severity: input.severity,
        dimension: input.dimension,
        evidenceIds: [],
        mitigation: input.mitigation,
        createdAt: input.now ?? nowTimestamp(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueRiskProps): ValueRisk {
    return new ValueRisk(props);
  }
  toSnapshot(): ValueRiskProps {
    return this.props;
  }
}

export type ValueOpportunityProps = Readonly<{
  id: ValueOpportunityId;
  ventureId: VentureId;
  title: string;
  description: string;
  magnitude: OpportunityMagnitude;
  dimension?: ValueDimension;
  evidenceIds: readonly ValueEvidenceId[];
  createdAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueOpportunity {
  private constructor(readonly props: ValueOpportunityProps) {}
  get id(): ValueOpportunityId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    title: string;
    description: string;
    magnitude: OpportunityMagnitude;
    dimension?: ValueDimension;
    now?: IsoTimestamp;
  }): Result<ValueOpportunity, DomainError> {
    const title = input.title.trim();
    if (!title) return err(DomainError.invariant("ValueOpportunity", "title required"));
    return ok(
      new ValueOpportunity({
        id: asValueOpportunityId(input.id),
        ventureId: input.ventureId,
        title,
        description: input.description.trim(),
        magnitude: input.magnitude,
        dimension: input.dimension,
        evidenceIds: [],
        createdAt: input.now ?? nowTimestamp(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueOpportunityProps): ValueOpportunity {
    return new ValueOpportunity(props);
  }
  toSnapshot(): ValueOpportunityProps {
    return this.props;
  }
}

// ─── ValueRecommendation ─────────────────────────────────────────────────────

export type ValueRecommendationProps = Readonly<{
  id: ValueRecommendationId;
  ventureId: VentureId;
  type: RecommendationType;
  reason: string;
  evidenceIds: readonly ValueEvidenceId[];
  confidence: ConfidenceType;
  expectedBenefit: string;
  cost?: TypedMoneyValue;
  risk: string;
  reversibility: "REVERSIBLE" | "PARTIALLY_REVERSIBLE" | "IRREVERSIBLE";
  requiresApproval: boolean;
  approvalStatus: RecommendationApprovalStatus;
  approvalNote?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueRecommendation {
  private constructor(readonly props: ValueRecommendationProps) {}
  get id(): ValueRecommendationId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    type: RecommendationType;
    reason: string;
    evidenceIds?: readonly ValueEvidenceId[];
    confidence: number;
    expectedBenefit: string;
    cost?: TypedMoneyValue;
    risk: string;
    reversibility: "REVERSIBLE" | "PARTIALLY_REVERSIBLE" | "IRREVERSIBLE";
    now?: IsoTimestamp;
  }): Result<ValueRecommendation, DomainError> {
    const reason = input.reason.trim();
    if (!reason) return err(DomainError.invariant("ValueRecommendation", "reason required"));
    const conf = Confidence(input.confidence);
    if (!conf.ok) return err(conf.error);
    const requiresApproval = REQUIRES_APPROVAL_RECOMMENDATIONS.includes(input.type);
    const ts = input.now ?? nowTimestamp();
    return ok(
      new ValueRecommendation({
        id: asValueRecommendationId(input.id),
        ventureId: input.ventureId,
        type: input.type,
        reason,
        evidenceIds: input.evidenceIds ?? [],
        confidence: conf.value,
        expectedBenefit: input.expectedBenefit.trim(),
        cost: input.cost,
        risk: input.risk.trim(),
        reversibility: input.reversibility,
        requiresApproval,
        approvalStatus: requiresApproval ? "PENDING_APPROVAL" : "DRAFT",
        createdAt: ts,
        updatedAt: ts,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: ValueRecommendationProps): ValueRecommendation {
    return new ValueRecommendation(props);
  }
  approve(note?: string, now: IsoTimestamp = nowTimestamp()): Result<ValueRecommendation, DomainError> {
    if (!this.props.requiresApproval) {
      return err(DomainError.invariant("ValueRecommendation", "approval not required"));
    }
    if (this.props.approvalStatus !== "PENDING_APPROVAL") {
      return err(DomainError.invariant("ValueRecommendation", "not pending approval"));
    }
    return ok(
      new ValueRecommendation({
        ...this.props,
        approvalStatus: "APPROVED",
        approvalNote: note,
        updatedAt: now,
      })
    );
  }
  reject(note: string, now: IsoTimestamp = nowTimestamp()): Result<ValueRecommendation, DomainError> {
    if (this.props.approvalStatus !== "PENDING_APPROVAL") {
      return err(DomainError.invariant("ValueRecommendation", "not pending approval"));
    }
    return ok(
      new ValueRecommendation({
        ...this.props,
        approvalStatus: "REJECTED",
        approvalNote: note.trim(),
        updatedAt: now,
      })
    );
  }
  /** Never auto-executes PAUSE/PIVOT/MERGE/CLOSE — execution is external + gated. */
  canAutoExecute(): boolean {
    return !this.props.requiresApproval;
  }
  toSnapshot(): ValueRecommendationProps {
    return this.props;
  }
}

// ─── VentureEconomics ────────────────────────────────────────────────────────

export type VentureEconomicsProps = Readonly<{
  id: VentureEconomicsId;
  ventureId: VentureId;
  currency: string;
  actualRevenue?: TypedMoneyValue;
  projectedRevenue?: TypedMoneyValue;
  recurringRevenue?: TypedMoneyValue;
  grossMargin?: TypedMoneyValue;
  operatingCost?: TypedMoneyValue;
  aiCost?: TypedMoneyValue;
  infraCost?: TypedMoneyValue;
  acquisitionCost?: TypedMoneyValue;
  humanCost?: TypedMoneyValue;
  totalInvested?: TypedMoneyValue;
  costToNextMilestone?: TypedMoneyValue;
  runwayMonths?: { value?: number; valueType: MetricValueType; source: string; confidence: ConfidenceType; updatedAt: IsoTimestamp };
  expectedValueRange?: {
    low: TypedMoneyValue;
    high: TypedMoneyValue;
    note: string;
  };
  updatedAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class VentureEconomics {
  private constructor(readonly props: VentureEconomicsProps) {}
  get id(): VentureEconomicsId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    currency: string;
    now?: IsoTimestamp;
  }): Result<VentureEconomics, DomainError> {
    const currency = input.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      return err(DomainError.invariant("VentureEconomics", "currency must be ISO-4217"));
    }
    return ok(
      new VentureEconomics({
        id: asVentureEconomicsId(input.id),
        ventureId: input.ventureId,
        currency,
        updatedAt: input.now ?? nowTimestamp(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: VentureEconomicsProps): VentureEconomics {
    return new VentureEconomics(props);
  }
  withField(
    field: keyof Omit<VentureEconomicsProps, "id" | "ventureId" | "currency" | "updatedAt" | "schemaVersion">,
    value: VentureEconomicsProps[typeof field],
    now: IsoTimestamp = nowTimestamp()
  ): Result<VentureEconomics, DomainError> {
    if (value && typeof value === "object" && "money" in (value as object)) {
      const tv = value as TypedMoneyValue;
      if (tv.money.currency !== this.props.currency) {
        return err(
          DomainError.invariant(
            "VentureEconomics",
            `currency mismatch: expected ${this.props.currency}, got ${tv.money.currency}`
          )
        );
      }
    }
    return ok(
      new VentureEconomics({
        ...this.props,
        [field]: value,
        updatedAt: now,
      })
    );
  }
  toSnapshot(): VentureEconomicsProps {
    return this.props;
  }
}

// ─── VentureTraction / CustomerEvidence ──────────────────────────────────────

export type VentureTractionProps = Readonly<{
  id: VentureTractionId;
  ventureId: VentureId;
  activeUsers?: { value: number; valueType: MetricValueType; source: string };
  payingCustomers?: { value: number; valueType: MetricValueType; source: string };
  retention?: { value: number; valueType: MetricValueType; source: string };
  notes: string;
  evidenceIds: readonly ValueEvidenceId[];
  updatedAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class VentureTraction {
  private constructor(readonly props: VentureTractionProps) {}
  get id(): VentureTractionId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    notes?: string;
    now?: IsoTimestamp;
  }): VentureTraction {
    return new VentureTraction({
      id: asVentureTractionId(input.id),
      ventureId: input.ventureId,
      notes: input.notes ?? "",
      evidenceIds: [],
      updatedAt: input.now ?? nowTimestamp(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
  }
  static rehydrate(props: VentureTractionProps): VentureTraction {
    return new VentureTraction(props);
  }
  toSnapshot(): VentureTractionProps {
    return this.props;
  }
}

export type CustomerEvidenceProps = Readonly<{
  id: CustomerEvidenceId;
  ventureId: VentureId;
  evidenceId: ValueEvidenceId;
  customerRef: string;
  segment?: string;
  interviewNotesRef?: string;
  intentSignal?: string;
  createdAt: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class CustomerEvidence {
  private constructor(readonly props: CustomerEvidenceProps) {}
  get id(): CustomerEvidenceId {
    return this.props.id;
  }
  static create(input: {
    id: string;
    ventureId: VentureId;
    evidenceId: ValueEvidenceId;
    customerRef: string;
    segment?: string;
    interviewNotesRef?: string;
    intentSignal?: string;
    now?: IsoTimestamp;
  }): Result<CustomerEvidence, DomainError> {
    const customerRef = input.customerRef.trim();
    if (!customerRef) {
      return err(DomainError.invariant("CustomerEvidence", "customerRef required"));
    }
    return ok(
      new CustomerEvidence({
        id: asCustomerEvidenceId(input.id),
        ventureId: input.ventureId,
        evidenceId: input.evidenceId,
        customerRef,
        segment: input.segment,
        interviewNotesRef: input.interviewNotesRef,
        intentSignal: input.intentSignal,
        createdAt: input.now ?? nowTimestamp(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }
  static rehydrate(props: CustomerEvidenceProps): CustomerEvidence {
    return new CustomerEvidence(props);
  }
  toSnapshot(): CustomerEvidenceProps {
    return this.props;
  }
}

// ─── ValueSnapshot (immutable) ───────────────────────────────────────────────

export type ValueSnapshotProps = Readonly<{
  id: ValueSnapshotId;
  ventureId: VentureId;
  stage: ValueStage;
  dimensions: readonly DimensionAssessment[];
  metrics: readonly ValueMetricProps[];
  evidence: readonly ValueEvidenceProps[];
  economics?: VentureEconomicsProps;
  risks: readonly ValueRiskProps[];
  nextMilestone?: ValueMilestoneProps;
  recommendation?: ValueRecommendationProps;
  confidence: ConfidenceType;
  timestamp: IsoTimestamp;
  schemaVersion: SchemaVersion;
}>;

export class ValueSnapshot {
  private constructor(readonly props: ValueSnapshotProps) {}
  get id(): ValueSnapshotId {
    return this.props.id;
  }
  static create(input: Omit<ValueSnapshotProps, "id" | "schemaVersion"> & { id: string }): ValueSnapshot {
    return new ValueSnapshot({
      ...input,
      id: asValueSnapshotId(input.id),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
  }
  static rehydrate(props: ValueSnapshotProps): ValueSnapshot {
    return new ValueSnapshot(props);
  }
  toSnapshot(): ValueSnapshotProps {
    return this.props;
  }
}
