/**
 * Multi-venture execution coordinator — PROGRAM 6110
 * Integrates with existing Runtime / Task Queue via ExecutionPort.
 */

import type { ApplicationPorts } from "../ports";
import type { PortfolioProps } from "../../domain/portfolio/aggregate";
import { Portfolio } from "../../domain/portfolio/aggregate";
import type { VenturePriority } from "../../domain/portfolio/types";

const PRIORITY_WEIGHT: Record<VenturePriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
  PAUSED: 0,
};

export type VentureExecutionRequest = Readonly<{
  workspaceId: string;
  portfolioId: string;
  ventureId: string;
  missionId: string;
  priority: VenturePriority;
  executionClass: "AI" | "BUILD" | "PREVIEW" | "RESEARCH";
  resourceRequirements?: Record<string, number>;
  ownerId: string;
  isolationContext: string;
}>;

export type VentureExecutionResult = Readonly<{
  ventureId: string;
  missionId: string;
  status: "ACCEPTED" | "QUEUED" | "REJECTED" | "FAILED";
  executionId?: string;
  error?: string;
}>;

export type MultiVentureExecutorLimits = Readonly<{
  maxConcurrentPerVenture: number;
  maxConcurrentGlobal: number;
  maxConcurrentPerWorkspace: number;
}>;

const DEFAULT_LIMITS: MultiVentureExecutorLimits = {
  maxConcurrentPerVenture: 2,
  maxConcurrentGlobal: 10,
  maxConcurrentPerWorkspace: 8,
};

export class MultiVentureExecutor {
  private active = new Map<string, VentureExecutionRequest & { startedAt: string }>();
  private failures = new Map<string, string>();

  constructor(
    private readonly ports: ApplicationPorts,
    private readonly limits: MultiVentureExecutorLimits = DEFAULT_LIMITS,
  ) {}

  getActiveCount(ventureId?: string): number {
    if (!ventureId) return this.active.size;
    return [...this.active.values()].filter((e) => e.ventureId === ventureId).length;
  }

  getExecutionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const exec of this.active.values()) {
      counts[exec.ventureId] = (counts[exec.ventureId] ?? 0) + 1;
    }
    return counts;
  }

  getFailure(ventureId: string): string | undefined {
    return this.failures.get(ventureId);
  }

  async submit(
    portfolio: PortfolioProps,
    request: VentureExecutionRequest,
  ): Promise<VentureExecutionResult> {
    const aggregate = Portfolio.rehydrate(portfolio);

    if (!aggregate.canStartMission(request.ventureId)) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "REJECTED",
        error: "venture closed or archived — cannot start missions",
      };
    }
    if (!aggregate.canStartAutomaticTasks(request.ventureId)) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "REJECTED",
        error: "venture paused — automatic tasks blocked",
      };
    }

    const ventureActive = this.getActiveCount(request.ventureId);
    if (ventureActive >= this.limits.maxConcurrentPerVenture) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "QUEUED",
        error: "venture concurrency limit reached",
      };
    }
    if (this.active.size >= this.limits.maxConcurrentGlobal) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "QUEUED",
        error: "global concurrency limit reached",
      };
    }

    const workspaceActive = [...this.active.values()].filter(
      (e) => e.workspaceId === request.workspaceId,
    ).length;
    if (workspaceActive >= this.limits.maxConcurrentPerWorkspace) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "QUEUED",
        error: "workspace concurrency limit reached",
      };
    }

    try {
      const result = await this.ports.execution.requestExecution({
        kind: request.executionClass,
        missionId: request.missionId,
      });
      if (!result.accepted) {
        this.failures.set(request.ventureId, "execution rejected by runtime");
        return {
          ventureId: request.ventureId,
          missionId: request.missionId,
          status: "FAILED",
          error: "execution rejected by runtime",
        };
      }
      const key = result.executionId ?? `${request.ventureId}-${request.missionId}`;
      this.active.set(key, { ...request, startedAt: this.ports.clock.now() });
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "ACCEPTED",
        executionId: key,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "execution failed";
      this.failures.set(request.ventureId, msg);
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "FAILED",
        error: msg,
      };
    }
  }

  release(executionId: string): void {
    this.active.delete(executionId);
  }

  releaseByVenture(ventureId: string): void {
    for (const [id, exec] of this.active.entries()) {
      if (exec.ventureId === ventureId) this.active.delete(id);
    }
  }

  /** Fair ordering: higher priority first, then FIFO within priority */
  orderQueue(requests: VentureExecutionRequest[]): VentureExecutionRequest[] {
    return [...requests].sort((a, b) => {
      const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (pw !== 0) return pw;
      return a.missionId.localeCompare(b.missionId);
    });
  }

  simulateFailure(ventureId: string, reason: string): void {
    this.failures.set(ventureId, reason);
    this.releaseByVenture(ventureId);
  }
}
