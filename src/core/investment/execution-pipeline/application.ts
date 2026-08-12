import {
  EXECUTION_PIPELINE_STAGES,
  REJECTION_REASON_CATALOG,
  assertCommand,
  assertValidTransition,
  type ApprovalPolicyArtifact,
  type ExecutionPipelineAggregate,
  type ExecutionPipelineStage,
  type ExecutionPipelineState,
  type PipelineExplanation,
  type PipelineTraceRecord,
  type PipelineTransition,
  type StageArtifacts,
} from "./domain";

export interface TransitionCommand {
  readonly pipelineId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedFrom: ExecutionPipelineState;
  readonly to: ExecutionPipelineState;
  readonly reason: string;
  readonly at?: string;
}

export interface PipelineStateRepository {
  getById(pipelineId: string): Promise<ExecutionPipelineAggregate | undefined>;
  save(aggregate: ExecutionPipelineAggregate): Promise<void>;
}

export interface IdempotencyStore {
  has(idempotencyKey: string): Promise<boolean>;
  save(idempotencyKey: string, transition: PipelineTransition): Promise<void>;
  get(idempotencyKey: string): Promise<PipelineTransition | undefined>;
}

export interface EventPublisher {
  publish(eventName: string, payload: Readonly<Record<string, unknown>>): Promise<void>;
}

export interface AuditWriter {
  write(entry: Readonly<Record<string, unknown>>): Promise<void>;
}

export interface StageContext {
  readonly nowIso: string;
}

export interface StageEvaluator<S extends ExecutionPipelineStage> {
  readonly stage: S;
  evaluate(
    aggregate: Readonly<ExecutionPipelineAggregate>,
    context: StageContext,
  ): Promise<{ passed: boolean; reason: string; artifact: StageArtifacts[S] }>;
}

export interface ExecutionPipelineDependencies {
  readonly repository: PipelineStateRepository;
  readonly idempotencyStore: IdempotencyStore;
  readonly eventPublisher: EventPublisher;
  readonly auditWriter: AuditWriter;
  readonly stageEvaluators: { [S in ExecutionPipelineStage]: StageEvaluator<S> };
  readonly liveExecutionEnabled?: boolean;
  readonly entryGate?: {
    getEntryBlockStatus(): Promise<{ blocked: boolean; reason: string; status: "OK" | "RECONCILIATION_REQUIRED" }>;
  };
}

export interface RunPipelineInput {
  readonly pipelineId: string;
  readonly symbol: string;
  readonly seedArtifact: StageArtifacts["OpportunityCandidate"];
}

export interface RunPipelineResult {
  readonly pipelineId: string;
  readonly finalState: ExecutionPipelineState;
  readonly trace: readonly PipelineTraceRecord[];
  readonly explanation?: PipelineExplanation;
  readonly transitions: readonly PipelineTransition[];
}

export class ExecutionPipelineOrchestrator {
  private readonly deps: ExecutionPipelineDependencies;

  constructor(deps: ExecutionPipelineDependencies) {
    this.deps = deps;
  }

  async run(input: RunPipelineInput): Promise<RunPipelineResult> {
    const existing = await this.deps.repository.getById(input.pipelineId);
    const aggregate: ExecutionPipelineAggregate = existing ?? {
      pipelineId: input.pipelineId,
      symbol: input.symbol,
      state: "DETECTED",
      stages: [],
      transitions: [],
    };

    if (aggregate.stages.length === 0) {
      aggregate.stages.push({
        stage: "OpportunityCandidate",
        sequence: 1,
        passed: true,
        reason: "Candidate detected.",
        artifact: input.seedArtifact,
      });
      await this.deps.repository.save(aggregate);
    }

    await this.transition({
      pipelineId: aggregate.pipelineId,
      commandId: `${aggregate.pipelineId}:detect-to-analyzing`,
      idempotencyKey: `${aggregate.pipelineId}:detect-to-analyzing`,
      expectedFrom: "DETECTED",
      to: "ANALYZING",
      reason: "Pipeline analysis started.",
    });

    if (this.deps.entryGate) {
      const entryBlockStatus = await this.deps.entryGate.getEntryBlockStatus();
      if (entryBlockStatus.blocked) {
        aggregate.stages.push({
          stage: "PreTradeCheck",
          sequence: aggregate.stages.length + 1,
          passed: false,
          reason: entryBlockStatus.reason,
          artifact: {
            approved: false,
            checks: {
              POSITION_RECONCILIATION:
                entryBlockStatus.status === "RECONCILIATION_REQUIRED" ? "FAIL" : "PASS",
            },
            reason: entryBlockStatus.reason,
          },
        });
        await this.deps.repository.save(aggregate);
        await this.transition({
          pipelineId: aggregate.pipelineId,
          commandId: `${aggregate.pipelineId}:entry-gate-blocked`,
          idempotencyKey: `${aggregate.pipelineId}:entry-gate-blocked`,
          expectedFrom: "ANALYZING",
          to: "REJECTED",
          reason: entryBlockStatus.reason,
        });
        return {
          pipelineId: aggregate.pipelineId,
          finalState: "REJECTED",
          trace: aggregate.stages,
          transitions: aggregate.transitions,
        };
      }
    }

    for (const stage of EXECUTION_PIPELINE_STAGES.slice(1)) {
      this.assertStageOrder(aggregate, stage);
      const evaluation = await this.deps.stageEvaluators[stage].evaluate(aggregate, {
        nowIso: new Date().toISOString(),
      });

      aggregate.stages.push({
        stage,
        sequence: aggregate.stages.length + 1,
        passed: evaluation.passed,
        reason: evaluation.reason,
        artifact: evaluation.artifact as StageArtifacts[typeof stage],
      });
      await this.deps.repository.save(aggregate);

      if (!evaluation.passed) {
        await this.transition({
          pipelineId: aggregate.pipelineId,
          commandId: `${aggregate.pipelineId}:${stage}:reject`,
          idempotencyKey: `${aggregate.pipelineId}:${stage}:reject`,
          expectedFrom: "ANALYZING",
          to: "REJECTED",
          reason: evaluation.reason,
        });
        return {
          pipelineId: aggregate.pipelineId,
          finalState: "REJECTED",
          trace: aggregate.stages,
          transitions: aggregate.transitions,
        };
      }
    }

    const approval = aggregate.stages.find((s) => s.stage === "ApprovalPolicy")
      ?.artifact as ApprovalPolicyArtifact | undefined;
    const plan = aggregate.stages.find((s) => s.stage === "ExecutionPlan")?.artifact as
      | StageArtifacts["ExecutionPlan"]
      | undefined;
    const risk = aggregate.stages.find((s) => s.stage === "RiskDecision")?.artifact as
      | StageArtifacts["RiskDecision"]
      | undefined;
    const liquidity = aggregate.stages.find((s) => s.stage === "LiquidityDecision")?.artifact as
      | StageArtifacts["LiquidityDecision"]
      | undefined;
    const session = aggregate.stages.find((s) => s.stage === "MarketSessionDecision")?.artifact as
      | StageArtifacts["MarketSessionDecision"]
      | undefined;
    const portfolioImpact = aggregate.stages.find((s) => s.stage === "PortfolioImpact")
      ?.artifact as StageArtifacts["PortfolioImpact"] | undefined;
    const rejectReason = this.computeRejectionHint(aggregate.stages);

    if (!approval || !plan || !risk || !liquidity || !session || !portfolioImpact) {
      throw new Error("Missing mandatory artifacts for explanation payload.");
    }

    aggregate.explanation = {
      whyEnter: "All mandatory stages approved the order draft path.",
      whyNotEnter: rejectReason,
      quantity: plan.quantity,
      price: plan.price,
      stop: plan.stop,
      target: plan.target,
      duration: plan.duration,
      monetaryRisk: risk.monetaryRisk,
      percentRisk: risk.percentRisk,
      portfolioImpact: `Exposure ${portfolioImpact.expectedExposureChangePct}% / concentration ${portfolioImpact.concentrationImpactPct}%`,
      estimatedCost: plan.estimatedCost,
      liquidity: `${liquidity.band} (${liquidity.estimatedSlippageBps} bps slippage est.)`,
      marketSession: session.session,
      cancellationConditions: plan.cancellationConditions,
    };

    if (approval.route === "SIMULATION") {
      await this.transition({
        pipelineId: aggregate.pipelineId,
        commandId: `${aggregate.pipelineId}:approve-sim`,
        idempotencyKey: `${aggregate.pipelineId}:approve-sim`,
        expectedFrom: "ANALYZING",
        to: "APPROVED_FOR_SIMULATION",
        reason: approval.reason,
      });
      await this.transition({
        pipelineId: aggregate.pipelineId,
        commandId: `${aggregate.pipelineId}:simulated`,
        idempotencyKey: `${aggregate.pipelineId}:simulated`,
        expectedFrom: "APPROVED_FOR_SIMULATION",
        to: "SIMULATED",
        reason: "Simulation completed for draft order.",
      });
    } else if (approval.route === "PAPER") {
      await this.transition({
        pipelineId: aggregate.pipelineId,
        commandId: `${aggregate.pipelineId}:approve-paper`,
        idempotencyKey: `${aggregate.pipelineId}:approve-paper`,
        expectedFrom: "ANALYZING",
        to: "APPROVED_FOR_PAPER",
        reason: approval.reason,
      });
      await this.transition({
        pipelineId: aggregate.pipelineId,
        commandId: `${aggregate.pipelineId}:paper-submitted`,
        idempotencyKey: `${aggregate.pipelineId}:paper-submitted`,
        expectedFrom: "APPROVED_FOR_PAPER",
        to: "PAPER_SUBMITTED",
        reason: "Paper order submitted to broker sandbox.",
      });
    } else {
      await this.transition({
        pipelineId: aggregate.pipelineId,
        commandId: `${aggregate.pipelineId}:approve-live`,
        idempotencyKey: `${aggregate.pipelineId}:approve-live`,
        expectedFrom: "ANALYZING",
        to: "APPROVED_FOR_LIVE",
        reason: approval.reason,
      });
      if (!this.deps.liveExecutionEnabled) {
        await this.transition({
          pipelineId: aggregate.pipelineId,
          commandId: `${aggregate.pipelineId}:live-blocked`,
          idempotencyKey: `${aggregate.pipelineId}:live-blocked`,
          expectedFrom: "APPROVED_FOR_LIVE",
          to: "LIVE_BLOCKED",
          reason: "Live execution is globally blocked.",
        });
      }
    }

    return {
      pipelineId: aggregate.pipelineId,
      finalState: aggregate.state,
      trace: aggregate.stages,
      explanation: aggregate.explanation,
      transitions: aggregate.transitions,
    };
  }

  async transition(command: TransitionCommand): Promise<PipelineTransition> {
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
    const transition: PipelineTransition = {
      commandId: command.commandId,
      idempotencyKey: command.idempotencyKey,
      from: command.expectedFrom,
      to: command.to,
      at: command.at ?? new Date().toISOString(),
      reason: command.reason,
    };
    aggregate.state = command.to;
    aggregate.transitions.push(transition);
    await this.deps.repository.save(aggregate);
    await this.deps.eventPublisher.publish("InvestmentPipelineTransitioned", {
      pipelineId: aggregate.pipelineId,
      from: transition.from,
      to: transition.to,
      reason: transition.reason,
      commandId: transition.commandId,
    });
    await this.deps.auditWriter.write({
      kind: "INVESTMENT_PIPELINE_TRANSITION",
      pipelineId: aggregate.pipelineId,
      transition,
    });
    await this.deps.idempotencyStore.save(command.idempotencyKey, transition);
    return transition;
  }

  private assertStageOrder(aggregate: ExecutionPipelineAggregate, nextStage: ExecutionPipelineStage): void {
    const expectedSequence = aggregate.stages.length + 1;
    const expectedStage = EXECUTION_PIPELINE_STAGES[expectedSequence - 1];
    if (expectedStage !== nextStage) {
      throw new Error(`Stage order violation: expected ${expectedStage}, got ${nextStage}`);
    }
  }

  private computeRejectionHint(trace: readonly PipelineTraceRecord[]): string {
    const firstRejected = trace.find((s) => !s.passed);
    if (!firstRejected) {
      return "No rejection path hit.";
    }
    switch (firstRejected.stage) {
      case "StrategyDecision":
        return REJECTION_REASON_CATALOG.STRATEGY_REJECTED;
      case "InvestmentCommitteeDecision":
        return REJECTION_REASON_CATALOG.COMMITTEE_REJECTED;
      case "RiskDecision":
        return REJECTION_REASON_CATALOG.RISK_REJECTED;
      case "LiquidityDecision":
        return REJECTION_REASON_CATALOG.LIQUIDITY_REJECTED;
      case "MarketSessionDecision":
        return REJECTION_REASON_CATALOG.SESSION_REJECTED;
      case "PreTradeCheck":
        return REJECTION_REASON_CATALOG.PRE_TRADE_REJECTED;
      default:
        return "Pipeline rejected by mandatory stage.";
    }
  }
}
