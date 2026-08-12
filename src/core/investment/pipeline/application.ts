import {
  DECISION_PIPELINE_SCHEMA_VERSION,
  DECISION_PIPELINE_STAGES,
  assertCommand,
  assertStageOrder,
  assertValidTransition,
  buildReproducibilityKey,
  ensureSerializableDecision,
  hashInputs,
  isTerminalState,
  type DecisionAuditEvent,
  type DecisionExplanation,
  type DecisionPipelineAggregate,
  type DecisionPipelineStage,
  type DecisionPipelineState,
  type DecisionPipelineTransition,
  type InstitutionalDecision,
  type InvestmentReportArtifact,
  type PipelineTraceRecord,
  type StageArtifacts,
} from "./domain";

export interface TransitionCommand {
  readonly pipelineId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedFrom: DecisionPipelineState;
  readonly to: DecisionPipelineState;
  readonly reason: string;
  readonly at?: string;
}

export interface PipelineStateRepository {
  getById(pipelineId: string): Promise<DecisionPipelineAggregate | undefined>;
  save(aggregate: DecisionPipelineAggregate): Promise<void>;
}

export interface IdempotencyStore {
  has(idempotencyKey: string): Promise<boolean>;
  save(idempotencyKey: string, transition: DecisionPipelineTransition): Promise<void>;
  get(idempotencyKey: string): Promise<DecisionPipelineTransition | undefined>;
}

export interface EventPublisher {
  publish(eventName: string, payload: Readonly<Record<string, unknown>>): Promise<void>;
}

export interface AuditWriter {
  write(entry: DecisionAuditEvent): Promise<void>;
}

export interface StageContext {
  readonly nowIso: string;
  readonly seed: string;
  readonly inputsHash: string;
  readonly symbol: string;
}

export interface StageEvaluationResult<S extends DecisionPipelineStage> {
  readonly passed: boolean;
  readonly reason: string;
  readonly artifact: StageArtifacts[S];
  readonly warnings?: readonly string[];
  /** When true, orchestrator parks in WAITING_FOR_RESEARCH before continuing. */
  readonly waitForResearch?: boolean;
  /** When true, orchestrator parks in WAITING_FOR_RISK before continuing. */
  readonly waitForRisk?: boolean;
  /** When true, orchestrator moves to INSUFFICIENT_DATA. */
  readonly insufficientData?: boolean;
}

export interface StageEvaluator<S extends DecisionPipelineStage> {
  readonly stage: S;
  evaluate(
    aggregate: Readonly<DecisionPipelineAggregate>,
    context: StageContext,
  ): Promise<StageEvaluationResult<S>>;
}

export type StageEvaluatorMap = { [S in DecisionPipelineStage]: StageEvaluator<S> };

/**
 * Ports for wiring existing investment modules. Adapters live in infrastructure.
 * Intentionally analysis-only — no order / broker surface.
 */
export interface DecisionPipelinePorts {
  readonly marketSnapshot?: {
    capture(symbol: string): Promise<StageArtifacts["MarketSnapshot"]>;
  };
  readonly investmentBrain?: {
    analyze(aggregate: Readonly<DecisionPipelineAggregate>): Promise<StageArtifacts["InvestmentBrain"]>;
  };
  readonly committee?: {
    deliberate(aggregate: Readonly<DecisionPipelineAggregate>): Promise<StageArtifacts["Committee"]>;
  };
  readonly research?: {
    research(aggregate: Readonly<DecisionPipelineAggregate>): Promise<StageArtifacts["Research"]>;
  };
  readonly portfolioAnalytics?: {
    analyze(aggregate: Readonly<DecisionPipelineAggregate>): Promise<StageArtifacts["PortfolioAnalytics"]>;
  };
  readonly riskEngine?: {
    assess(aggregate: Readonly<DecisionPipelineAggregate>): Promise<StageArtifacts["RiskEngine"]>;
  };
  readonly allocationEngine?: {
    propose(aggregate: Readonly<DecisionPipelineAggregate>): Promise<StageArtifacts["AllocationEngine"]>;
  };
  readonly memory?: {
    record(
      aggregate: Readonly<DecisionPipelineAggregate>,
      decision: InstitutionalDecision,
    ): Promise<StageArtifacts["Memory"]>;
  };
}

export interface DecisionPipelineDependencies {
  readonly repository: PipelineStateRepository;
  readonly idempotencyStore: IdempotencyStore;
  readonly eventPublisher: EventPublisher;
  readonly auditWriter: AuditWriter;
  readonly stageEvaluators: StageEvaluatorMap;
  readonly ports?: DecisionPipelinePorts;
  readonly now?: () => string;
  readonly createEventId?: () => string;
}

export interface RunDecisionPipelineInput {
  readonly pipelineId: string;
  readonly symbol: string;
  readonly seed: string;
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly createdAt?: string;
}

export interface RunDecisionPipelineResult {
  readonly pipelineId: string;
  readonly version: number;
  readonly finalState: DecisionPipelineState;
  readonly trace: readonly PipelineTraceRecord[];
  readonly transitions: readonly DecisionPipelineTransition[];
  readonly auditTrail: readonly DecisionAuditEvent[];
  readonly decision?: InstitutionalDecision;
  readonly report?: InvestmentReportArtifact;
  readonly reproducibility: {
    readonly inputsHash: string;
    readonly seed: string;
    readonly reproducibilityKey: string;
    readonly schemaVersion: string;
  };
}

export class DecisionPipelineOrchestrator {
  private readonly deps: DecisionPipelineDependencies;

  constructor(deps: DecisionPipelineDependencies) {
    this.deps = deps;
  }

  async run(input: RunDecisionPipelineInput): Promise<RunDecisionPipelineResult> {
    const now = this.deps.now?.() ?? new Date().toISOString();
    const inputsHash = hashInputs(input.inputs);
    const reproducibilityKey = buildReproducibilityKey(
      inputsHash,
      input.seed,
      DECISION_PIPELINE_SCHEMA_VERSION,
    );

    const existing = await this.deps.repository.getById(input.pipelineId);
    const aggregate: DecisionPipelineAggregate =
      existing ??
      ({
        pipelineId: input.pipelineId,
        symbol: input.symbol,
        schemaVersion: DECISION_PIPELINE_SCHEMA_VERSION,
        version: 1,
        state: "PENDING",
        seed: input.seed,
        inputsHash,
        reproducibilityKey,
        createdAt: input.createdAt ?? now,
        stages: [],
        transitions: [],
        auditTrail: [],
      } satisfies DecisionPipelineAggregate);

    if (!existing) {
      const createdEvent = this.createAuditEvent("DECISION_PIPELINE_CREATED", aggregate.pipelineId, now, {
        symbol: aggregate.symbol,
        seed: aggregate.seed,
        inputsHash: aggregate.inputsHash,
        reproducibilityKey: aggregate.reproducibilityKey,
        schemaVersion: aggregate.schemaVersion,
        version: aggregate.version,
      });
      aggregate.auditTrail.push(createdEvent);
      await this.deps.auditWriter.write(createdEvent);
      await this.deps.repository.save(aggregate);
    }

    if (isTerminalState(aggregate.state) && aggregate.state !== "PENDING") {
      return this.toResult(aggregate);
    }

    if (aggregate.state === "PENDING") {
      await this.transition({
        pipelineId: aggregate.pipelineId,
        commandId: `${aggregate.pipelineId}:pending-to-analyzing`,
        idempotencyKey: `${aggregate.pipelineId}:pending-to-analyzing`,
        expectedFrom: "PENDING",
        to: "ANALYZING",
        reason: "Institutional decision analysis started.",
        at: now,
      });
    }

    const context: StageContext = {
      nowIso: this.deps.now?.() ?? new Date().toISOString(),
      seed: aggregate.seed,
      inputsHash: aggregate.inputsHash,
      symbol: aggregate.symbol,
    };

    for (const stage of DECISION_PIPELINE_STAGES) {
      const alreadyDone = aggregate.stages.some((s) => s.stage === stage);
      if (alreadyDone) {
        continue;
      }

      assertStageOrder(
        aggregate.stages.map((s) => s.stage),
        stage,
      );

      if (stage === "Research") {
        await this.parkAndResume(
          aggregate,
          "WAITING_FOR_RESEARCH",
          "Awaiting research stage inputs.",
          "Research inputs available; resuming analysis.",
        );
      }
      if (stage === "RiskEngine") {
        await this.parkAndResume(
          aggregate,
          "WAITING_FOR_RISK",
          "Awaiting risk engine assessment.",
          "Risk assessment available; resuming analysis.",
        );
      }

      const evaluation = await this.deps.stageEvaluators[stage].evaluate(aggregate, context);
      const warnings = evaluation.warnings ?? [];

      const record: PipelineTraceRecord = {
        stage,
        sequence: aggregate.stages.length + 1,
        passed: evaluation.passed,
        reason: evaluation.reason,
        artifact: evaluation.artifact as StageArtifacts[typeof stage],
        warnings,
      };
      aggregate.stages.push(record);
      aggregate.version += 1;

      const stageEvent = this.createAuditEvent(
        "DECISION_PIPELINE_STAGE_COMPLETED",
        aggregate.pipelineId,
        context.nowIso,
        {
          stage,
          sequence: record.sequence,
          passed: record.passed,
          reason: record.reason,
          warnings: [...warnings],
          version: aggregate.version,
        },
      );
      aggregate.auditTrail.push(stageEvent);
      await this.deps.auditWriter.write(stageEvent);
      await this.deps.repository.save(aggregate);

      if (evaluation.insufficientData || (stage === "MarketSnapshot" && !evaluation.passed)) {
        await this.transition({
          pipelineId: aggregate.pipelineId,
          commandId: `${aggregate.pipelineId}:${stage}:insufficient`,
          idempotencyKey: `${aggregate.pipelineId}:${stage}:insufficient`,
          expectedFrom: "ANALYZING",
          to: "INSUFFICIENT_DATA",
          reason: evaluation.reason,
        });
        return this.toResult(aggregate);
      }

      if (!evaluation.passed) {
        await this.transition({
          pipelineId: aggregate.pipelineId,
          commandId: `${aggregate.pipelineId}:${stage}:reject`,
          idempotencyKey: `${aggregate.pipelineId}:${stage}:reject`,
          expectedFrom: "ANALYZING",
          to: "REJECTED",
          reason: evaluation.reason,
        });
        return this.toResult(aggregate);
      }

      if (evaluation.waitForResearch && stage === "Research") {
        // Already handled via parkAndResume; keep hook for adapters that request extra wait.
      }
      if (evaluation.waitForRisk && stage === "RiskEngine") {
        // Already handled via parkAndResume.
      }
    }

    const decision = this.buildDecision(aggregate, context.nowIso);
    aggregate.decision = decision;
    aggregate.report = this.extractReport(aggregate);
    aggregate.version += 1;

    const hasWarnings = aggregate.stages.some((s) => s.warnings.length > 0) || decision.warnings.length > 0;
    const finalState: DecisionPipelineState = hasWarnings ? "APPROVED_WITH_WARNINGS" : "APPROVED";

    await this.transition({
      pipelineId: aggregate.pipelineId,
      commandId: `${aggregate.pipelineId}:finalize:${finalState}`,
      idempotencyKey: `${aggregate.pipelineId}:finalize:${finalState}`,
      expectedFrom: "ANALYZING",
      to: finalState,
      reason: hasWarnings
        ? "Decision approved with warnings after full stage traversal."
        : "Decision approved after full stage traversal.",
    });

    const finalized = this.createAuditEvent("DECISION_PIPELINE_FINALIZED", aggregate.pipelineId, context.nowIso, {
      finalState,
      version: aggregate.version,
      decisionId: decision.decisionId,
      reproducibilityKey: aggregate.reproducibilityKey,
    });
    aggregate.auditTrail.push(finalized);
    await this.deps.auditWriter.write(finalized);
    await this.deps.repository.save(aggregate);

    return this.toResult(aggregate);
  }

  async transition(command: TransitionCommand): Promise<DecisionPipelineTransition> {
    assertCommand(command.commandId, command.idempotencyKey);
    const aggregate = await this.deps.repository.getById(command.pipelineId);
    if (!aggregate) {
      throw new Error(`Pipeline ${command.pipelineId} not found.`);
    }
    const cached = await this.deps.idempotencyStore.get(command.idempotencyKey);
    if (cached) {
      return cached;
    }
    if (aggregate.state !== command.expectedFrom) {
      throw new Error(`State mismatch expected ${command.expectedFrom}, got ${aggregate.state}`);
    }
    assertValidTransition(command.expectedFrom, command.to);
    const transition: DecisionPipelineTransition = {
      commandId: command.commandId,
      idempotencyKey: command.idempotencyKey,
      from: command.expectedFrom,
      to: command.to,
      at: command.at ?? this.deps.now?.() ?? new Date().toISOString(),
      reason: command.reason,
    };
    aggregate.state = command.to;
    aggregate.transitions.push(transition);
    aggregate.version += 1;

    const auditEvent = this.createAuditEvent(
      "DECISION_PIPELINE_TRANSITION",
      aggregate.pipelineId,
      transition.at,
      {
        from: transition.from,
        to: transition.to,
        reason: transition.reason,
        commandId: transition.commandId,
        idempotencyKey: transition.idempotencyKey,
        version: aggregate.version,
      },
    );
    aggregate.auditTrail.push(auditEvent);

    await this.deps.repository.save(aggregate);
    await this.deps.eventPublisher.publish("InvestmentDecisionPipelineTransitioned", {
      pipelineId: aggregate.pipelineId,
      from: transition.from,
      to: transition.to,
      reason: transition.reason,
      commandId: transition.commandId,
    });
    await this.deps.auditWriter.write(auditEvent);
    await this.deps.idempotencyStore.save(command.idempotencyKey, transition);
    return transition;
  }

  private async parkAndResume(
    aggregate: DecisionPipelineAggregate,
    waitingState: "WAITING_FOR_RESEARCH" | "WAITING_FOR_RISK",
    waitReason: string,
    resumeReason: string,
  ): Promise<void> {
    await this.transition({
      pipelineId: aggregate.pipelineId,
      commandId: `${aggregate.pipelineId}:enter-${waitingState}`,
      idempotencyKey: `${aggregate.pipelineId}:enter-${waitingState}`,
      expectedFrom: "ANALYZING",
      to: waitingState,
      reason: waitReason,
    });
    await this.transition({
      pipelineId: aggregate.pipelineId,
      commandId: `${aggregate.pipelineId}:leave-${waitingState}`,
      idempotencyKey: `${aggregate.pipelineId}:leave-${waitingState}`,
      expectedFrom: waitingState,
      to: "ANALYZING",
      reason: resumeReason,
    });
  }

  private buildDecision(aggregate: DecisionPipelineAggregate, nowIso: string): InstitutionalDecision {
    const brain = this.findArtifact(aggregate, "InvestmentBrain");
    const committee = this.findArtifact(aggregate, "Committee");
    const research = this.findArtifact(aggregate, "Research");
    const risk = this.findArtifact(aggregate, "RiskEngine");
    const allocation = this.findArtifact(aggregate, "AllocationEngine");
    const decisionArtifact = this.findArtifact(aggregate, "InvestmentDecision");

    const warnings = [
      ...aggregate.stages.flatMap((s) => s.warnings),
      ...(decisionArtifact?.warnings ?? []),
      ...(risk?.warnings ?? []),
    ];

    const explanation: DecisionExplanation = {
      whyRecommend:
        decisionArtifact?.reasoning.join(" ") ??
        brain?.reasoning.join(" ") ??
        "All mandatory analytical stages completed.",
      whyNotRecommend: this.computeRejectionHint(aggregate.stages),
      keyEvidence: decisionArtifact?.evidence ?? brain?.evidence ?? [],
      keyRisks: decisionArtifact?.risks ?? brain?.risks ?? risk?.factors ?? [],
      committeeConsensus: committee
        ? `${committee.consensus} (confidence=${committee.confidence.toFixed(2)}, dissent=${committee.dissent.toFixed(2)})`
        : "n/a",
      researchThesis: research?.thesis ?? "n/a",
      riskLevel: risk?.level ?? "n/a",
      allocationSummary: allocation
        ? `cash=${allocation.targetCashPct}% equity=${allocation.targetEquityPct}% defensive=${allocation.targetDefensivePct}%`
        : "n/a",
      warnings,
    };

    const decision: InstitutionalDecision = {
      decisionId: `${aggregate.pipelineId}:v${aggregate.version + 1}`,
      pipelineId: aggregate.pipelineId,
      version: aggregate.version + 1,
      schemaVersion: aggregate.schemaVersion,
      state: warnings.length > 0 ? "APPROVED_WITH_WARNINGS" : "APPROVED",
      recommendation: decisionArtifact?.recommendation ?? brain?.recommendation ?? "hold",
      confidence: decisionArtifact?.confidence ?? brain?.confidence ?? 0,
      reasoning: decisionArtifact?.reasoning ?? brain?.reasoning ?? [],
      risks: decisionArtifact?.risks ?? brain?.risks ?? [],
      evidence: decisionArtifact?.evidence ?? brain?.evidence ?? [],
      warnings,
      explanation,
      reproducibility: {
        inputsHash: aggregate.inputsHash,
        seed: aggregate.seed,
        reproducibilityKey: aggregate.reproducibilityKey,
        schemaVersion: aggregate.schemaVersion,
      },
      stageTrace: [...aggregate.stages],
      createdAt: aggregate.createdAt,
      finalizedAt: nowIso,
    };

    return ensureSerializableDecision(decision);
  }

  private extractReport(aggregate: DecisionPipelineAggregate): InvestmentReportArtifact | undefined {
    const reportStage = aggregate.stages.find((s) => s.stage === "InvestmentReport");
    return reportStage?.artifact as InvestmentReportArtifact | undefined;
  }

  private findArtifact<S extends DecisionPipelineStage>(
    aggregate: DecisionPipelineAggregate,
    stage: S,
  ): StageArtifacts[S] | undefined {
    const found = aggregate.stages.find((s) => s.stage === stage);
    return found?.artifact as StageArtifacts[S] | undefined;
  }

  private computeRejectionHint(trace: readonly PipelineTraceRecord[]): string {
    const firstRejected = trace.find((s) => !s.passed);
    if (!firstRejected) {
      return "No rejection path hit.";
    }
    return `Rejected at ${firstRejected.stage}: ${firstRejected.reason}`;
  }

  private createAuditEvent(
    kind: DecisionAuditEvent["kind"],
    pipelineId: string,
    at: string,
    payload: DecisionAuditEvent["payload"],
  ): DecisionAuditEvent {
    return {
      eventId: this.deps.createEventId?.() ?? `${pipelineId}:${kind}:${at}:${Math.random().toString(36).slice(2, 8)}`,
      kind,
      pipelineId,
      at,
      payload,
    };
  }

  private toResult(aggregate: DecisionPipelineAggregate): RunDecisionPipelineResult {
    return {
      pipelineId: aggregate.pipelineId,
      version: aggregate.version,
      finalState: aggregate.state,
      trace: aggregate.stages,
      transitions: aggregate.transitions,
      auditTrail: aggregate.auditTrail,
      decision: aggregate.decision,
      report: aggregate.report,
      reproducibility: {
        inputsHash: aggregate.inputsHash,
        seed: aggregate.seed,
        reproducibilityKey: aggregate.reproducibilityKey,
        schemaVersion: aggregate.schemaVersion,
      },
    };
  }
}
