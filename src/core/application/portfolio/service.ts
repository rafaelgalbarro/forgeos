/**
 * Portfolio service — command/query orchestration — PROGRAM 6110
 */

import { Portfolio } from "../../domain/portfolio/aggregate";
import type { PortfolioProps } from "../../domain/portfolio/aggregate";
import { asPortfolioId, asSharedAssetId, asVentureId, asWorkspaceId } from "../../domain/shared/ids";
import { DomainError } from "../../domain/shared/errors";
import { asIsoTimestamp } from "../../domain/shared/value-objects";
import { createVentureAggregate } from "../compat-domain";
import type { ApplicationPorts } from "../ports";
import { fail } from "../errors";
import type { PortfolioCommand } from "./commands";
import type { PortfolioQuery } from "./queries";
import type { PortfolioDomainEvent } from "./events";
import {
  applyPortfolioEvent,
  buildPortfolioReadModel,
  buildPortfolioSummary,
  buildCapacityViews,
  buildRiskViews,
  createEmptyProjection,
  listVentureCards,
  type PortfolioProjectionState,
} from "./projections";
import { MultiVentureExecutor } from "./execution";

export interface PortfolioStorePort {
  getById(id: string): Promise<PortfolioProps | null>;
  listByWorkspace(workspaceId: string): Promise<PortfolioProps[]>;
  save(portfolio: PortfolioProps): Promise<void>;
}

export interface PortfolioServiceDeps {
  ports: ApplicationPorts;
  store: PortfolioStorePort;
  executor?: MultiVentureExecutor;
}

export class PortfolioService {
  private projections = new Map<string, PortfolioProjectionState>();
  readonly executor: MultiVentureExecutor;

  constructor(private readonly deps: PortfolioServiceDeps) {
    this.executor = deps.executor ?? new MultiVentureExecutor(deps.ports);
  }

  private async loadPortfolio(
    workspaceId: string,
    portfolioId: string,
  ): Promise<Portfolio> {
    const snap = await this.deps.store.getById(portfolioId);
    if (!snap) {
      fail({
        code: "PORTFOLIO_NOT_FOUND",
        message: `Portfolio not found: ${portfolioId}`,
        category: "not_found",
      });
    }
    if (snap.workspaceId !== workspaceId) {
      fail({
        code: "WORKSPACE_MISMATCH",
        message: "Portfolio does not belong to workspace",
        category: "authorization",
      });
    }
    return Portfolio.rehydrate(snap);
  }

  private getProjection(portfolio: PortfolioProps): PortfolioProjectionState {
    let state = this.projections.get(portfolio.id);
    if (!state) {
      state = createEmptyProjection(portfolio);
      this.projections.set(portfolio.id, state);
    } else if (state.portfolio.updatedAt !== portfolio.updatedAt) {
      state = { ...state, portfolio };
      this.projections.set(portfolio.id, state);
    }
    return state;
  }

  private async persist(portfolio: Portfolio, events: PortfolioDomainEvent[]): Promise<void> {
    const snap = portfolio.toSnapshot();
    await this.deps.store.save(snap);
    let state = this.getProjection(snap);
    for (const event of events) {
      state = applyPortfolioEvent(state, event);
    }
    state = {
      ...state,
      portfolio: snap,
      executionCounts: this.executor.getExecutionCounts(),
    };
    this.projections.set(snap.id, state);
    await this.deps.ports.uow.events.append(
      events.map((e) => ({
        eventId: e.eventId,
        id: e.eventId,
        type: e.type as never,
        aggregateId: e.aggregateId,
        aggregateType: "Portfolio",
        workspaceId: e.workspaceId,
        occurredAt: e.occurredAt,
        payload: e as unknown as Record<string, unknown>,
        correlationId: e.correlationId,
        schemaVersion: 1,
      })),
    );
  }

  private baseEvent(
    portfolio: Portfolio,
    command: PortfolioCommand,
    type: PortfolioDomainEvent["type"],
  ): Omit<PortfolioDomainEvent, "type"> & { type: typeof type } {
    return {
      type,
      eventId: this.deps.ports.clock.createId("evt"),
      aggregateId: portfolio.id,
      workspaceId: portfolio.workspaceId,
      portfolioId: portfolio.id,
      occurredAt: this.nowIso(),
      correlationId: command.meta.correlationId,
      actorId: command.meta.actorId,
    } as unknown as PortfolioDomainEvent;
  }

  private nowIso() {
    return asIsoTimestamp(this.deps.ports.clock.now());
  }

  private domainFail(error: DomainError): never {
    fail({
      code: error.code,
      message: error.message,
      category: error.code === "NOT_FOUND" ? "not_found" : "validation",
    });
  }

  async executeCommand(command: PortfolioCommand): Promise<unknown> {
    const { ports } = this.deps;
    const actor = command.meta.actorId;
    if (!actor) {
      fail({ code: "UNAUTHORIZED", message: "Actor required", category: "authorization" });
    }
    const workspaceId = command.payload.workspaceId;
    const canAccess = await ports.authorization.canAccessWorkspace(actor, workspaceId);
    if (!canAccess) {
      fail({
        code: "WORKSPACE_FORBIDDEN",
        message: "Cannot access workspace",
        category: "authorization",
      });
    }

    switch (command.type) {
      case "CreatePortfolio": {
        const id = ports.clock.createId("pf");
        const now = this.nowIso();
        const created = Portfolio.create({
          id,
          workspaceId: asWorkspaceId(workspaceId),
          name: command.payload.name,
          slug: command.payload.slug,
          workspaceLimits: command.payload.workspaceLimits,
          now,
        });
        if (!created.ok) this.domainFail(created.error);
        const event = {
          ...this.baseEvent(created.value, command, "PortfolioCreated"),
          name: command.payload.name,
          slug: command.payload.slug,
        } as PortfolioDomainEvent;
        await this.persist(created.value, [event]);
        return { portfolioId: id, name: command.payload.name };
      }

      case "AddVentureToPortfolio": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const venture = await ports.uow.ventures.getById(command.payload.ventureId);
        if (!venture) {
          fail({
            code: "VENTURE_NOT_FOUND",
            message: `Venture not found: ${command.payload.ventureId}`,
            category: "not_found",
          });
        }
        if (venture.workspaceId !== workspaceId) {
          fail({
            code: "WORKSPACE_MISMATCH",
            message: "Venture does not belong to workspace",
            category: "authorization",
          });
        }
        const updated = portfolio.addVenture({
          ventureId: asVentureId(command.payload.ventureId),
          priority: command.payload.priority,
          lifecycle: command.payload.lifecycle,
          now: this.nowIso(),
        });
        if (!updated.ok) this.domainFail(updated.error);
        const pv = updated.value.getVenture(asVentureId(command.payload.ventureId))!;
        const event = {
          ...this.baseEvent(updated.value, command, "VentureAddedToPortfolio"),
          ventureId: command.payload.ventureId,
          priority: pv.priority,
          lifecycle: pv.lifecycle,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { ventureId: command.payload.ventureId };
      }

      case "SetVenturePriority": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const prev = portfolio.getVenture(asVentureId(command.payload.ventureId));
        const updated = portfolio.setPriority(
          asVentureId(command.payload.ventureId),
          command.payload.priority,
          this.nowIso(),
        );
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "VenturePriorityChanged"),
          ventureId: command.payload.ventureId,
          previousPriority: prev?.priority ?? "NORMAL",
          newPriority: command.payload.priority,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { ventureId: command.payload.ventureId, priority: command.payload.priority };
      }

      case "SetVentureLifecycle": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const prev = portfolio.getVenture(asVentureId(command.payload.ventureId));
        const updated = portfolio.setLifecycle(
          asVentureId(command.payload.ventureId),
          command.payload.lifecycle,
          {
            actorId: actor,
            reason: command.payload.reason,
            evidence: command.payload.evidence,
            decisionId: command.payload.decisionId as never,
          },
          this.nowIso(),
        );
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "VentureLifecycleChanged"),
          ventureId: command.payload.ventureId,
          previousLifecycle: prev?.lifecycle ?? "IDEA",
          newLifecycle: command.payload.lifecycle,
          reason: command.payload.reason,
          evidence: command.payload.evidence,
          decisionId: command.payload.decisionId,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { ventureId: command.payload.ventureId, lifecycle: command.payload.lifecycle };
      }

      case "PauseVenture": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const updated = portfolio.pauseVenture(
          asVentureId(command.payload.ventureId),
          actor,
          command.payload.reason,
          this.nowIso(),
        );
        if (!updated.ok) this.domainFail(updated.error);
        this.executor.releaseByVenture(command.payload.ventureId);
        const event = {
          ...this.baseEvent(updated.value, command, "VenturePaused"),
          ventureId: command.payload.ventureId,
          reason: command.payload.reason,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { ventureId: command.payload.ventureId, paused: true };
      }

      case "ResumeVenture": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const updated = portfolio.resumeVenture(
          asVentureId(command.payload.ventureId),
          command.payload.priority,
          this.nowIso(),
        );
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "VentureResumed"),
          ventureId: command.payload.ventureId,
          priority: command.payload.priority,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { ventureId: command.payload.ventureId, paused: false };
      }

      case "ArchiveVenture": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const updated = portfolio.archiveVenture(
          asVentureId(command.payload.ventureId),
          this.nowIso(),
        );
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "VentureArchived"),
          ventureId: command.payload.ventureId,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { ventureId: command.payload.ventureId, archived: true };
      }

      case "CloseVenture": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const updated = portfolio.closeVenture(
          asVentureId(command.payload.ventureId),
          this.nowIso(),
        );
        if (!updated.ok) this.domainFail(updated.error);
        this.executor.releaseByVenture(command.payload.ventureId);
        const event = {
          ...this.baseEvent(updated.value, command, "VentureClosed"),
          ventureId: command.payload.ventureId,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { ventureId: command.payload.ventureId, closed: true };
      }

      case "AllocateBudget": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const allocId = ports.clock.createId("alloc");
        const now = this.nowIso();
        const allocation = {
          id: allocId,
          portfolioId: asPortfolioId(command.payload.portfolioId),
          ventureId: asVentureId(command.payload.ventureId),
          resourceType: command.payload.resourceType,
          limit: command.payload.limit,
          used: 0,
          reserved: 0,
          available: command.payload.limit,
          period: command.payload.period ?? "monthly",
          status: "AVAILABLE" as const,
          updatedAt: now,
        };
        const updated = portfolio.allocateResource(allocation, now);
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "BudgetAllocated"),
          ventureId: command.payload.ventureId,
          allocationId: allocId,
          resourceType: command.payload.resourceType,
          limit: command.payload.limit,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { allocationId: allocId };
      }

      case "ReleaseAllocation": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const updated = portfolio.releaseAllocation(command.payload.allocationId, this.nowIso());
        if (!updated.ok) this.domainFail(updated.error);
        const alloc = updated.value.toSnapshot().allocations[command.payload.allocationId];
        const event = {
          ...this.baseEvent(updated.value, command, "AllocationReleased"),
          allocationId: command.payload.allocationId,
          ventureId: alloc?.ventureId ?? "",
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { allocationId: command.payload.allocationId };
      }

      case "CreateVentureDependency": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const depId = ports.clock.createId("dep");
        const dep = {
          id: depId,
          portfolioId: asPortfolioId(command.payload.portfolioId),
          sourceVentureId: asVentureId(command.payload.sourceVentureId),
          targetVentureId: asVentureId(command.payload.targetVentureId),
          dependencyType: command.payload.dependencyType,
          description: command.payload.description,
          versionConstraint: command.payload.versionConstraint,
          approved: false,
          createdAt: this.nowIso(),
        };
        const updated = portfolio.addDependency(dep);
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "VentureDependencyCreated"),
          dependencyId: depId,
          sourceVentureId: command.payload.sourceVentureId,
          targetVentureId: command.payload.targetVentureId,
          dependencyType: command.payload.dependencyType,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { dependencyId: depId };
      }

      case "RegisterSharedAsset": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const assetId = ports.clock.createId("asset");
        const now = this.nowIso();
        const asset = {
          id: asSharedAssetId(assetId),
          portfolioId: asPortfolioId(command.payload.portfolioId),
          ownerVentureId: asVentureId(command.payload.ownerVentureId),
          allowedConsumerIds: command.payload.allowedConsumerIds.map(asVentureId),
          assetType: command.payload.assetType,
          name: command.payload.name,
          version: command.payload.version,
          securityClassification: (command.payload.securityClassification ??
            "INTERNAL") as "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED",
          approvalStatus: "PENDING" as const,
          createdAt: now,
          updatedAt: now,
        };
        const updated = portfolio.registerSharedAsset(asset);
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "SharedAssetRegistered"),
          assetId,
          ownerVentureId: command.payload.ownerVentureId,
          assetType: command.payload.assetType,
          name: command.payload.name,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { assetId };
      }

      case "ApproveSharedAssetUsage": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const updated = portfolio.approveSharedAssetUsage(
          asSharedAssetId(command.payload.assetId),
          asVentureId(command.payload.consumerVentureId),
          this.nowIso(),
        );
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "SharedAssetUsageApproved"),
          assetId: command.payload.assetId,
          consumerVentureId: command.payload.consumerVentureId,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { assetId: command.payload.assetId, approved: true };
      }

      case "CreatePortfolioPolicy": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const policyId = ports.clock.createId("pol");
        const now = this.nowIso();
        const policy = {
          id: policyId,
          portfolioId: asPortfolioId(command.payload.portfolioId),
          kind: command.payload.kind,
          config: command.payload.config,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        };
        const updated = portfolio.upsertPolicy(policy);
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "PortfolioPolicyCreated"),
          policyId,
          kind: command.payload.kind,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { policyId };
      }

      case "RecordPortfolioDecision": {
        const portfolio = await this.loadPortfolio(workspaceId, command.payload.portfolioId);
        const decisionId = ports.clock.createId("pdec");
        const decision = {
          id: decisionId,
          portfolioId: asPortfolioId(command.payload.portfolioId),
          ventureId: command.payload.ventureId
            ? asVentureId(command.payload.ventureId)
            : undefined,
          title: command.payload.title,
          description: command.payload.description,
          actorId: actor,
          outcome: command.payload.outcome,
          evidence: command.payload.evidence,
          recordedAt: this.nowIso(),
        };
        const updated = portfolio.recordDecision(decision);
        if (!updated.ok) this.domainFail(updated.error);
        const event = {
          ...this.baseEvent(updated.value, command, "PortfolioDecisionRecorded"),
          decisionId,
          title: command.payload.title,
          ventureId: command.payload.ventureId,
        } as PortfolioDomainEvent;
        await this.persist(updated.value, [event]);
        return { decisionId };
      }

      case "CreateVentureBatch": {
        const maxSize = command.payload.maxBatchSize ?? 10;
        if (command.payload.ventures.length > maxSize) {
          fail({
            code: "BATCH_TOO_LARGE",
            message: `Batch size ${command.payload.ventures.length} exceeds limit ${maxSize}`,
            category: "validation",
          });
        }
        const results: Array<{
          name: string;
          status: "created" | "rejected" | "queued" | "blocked";
          ventureId?: string;
          reason?: string;
        }> = [];
        for (const def of command.payload.ventures) {
          try {
            const ventureId = ports.clock.createId("ven");
            const now = this.nowIso();
            const { venture, events } = createVentureAggregate(
              ventureId,
              {
                workspaceId,
                name: def.name,
                slug: def.slug,
                idea: def.idea,
                ownerId: actor,
              },
              now,
            );
            await ports.uow.ventures.save(venture);
            await ports.uow.events.append(events);
            const addCmd = {
              ...command,
              type: "AddVentureToPortfolio" as const,
              payload: {
                workspaceId,
                portfolioId: command.payload.portfolioId,
                ventureId,
                priority: def.priority,
                lifecycle: def.lifecycle,
              },
            };
            await this.executeCommand(addCmd);
            results.push({ name: def.name, status: "created", ventureId });
          } catch (err) {
            const reason = err instanceof Error ? err.message : "unknown error";
            results.push({ name: def.name, status: "rejected", reason });
          }
        }
        return { results, startMode: command.payload.startMode };
      }

      case "PauseVentureBatch": {
        const results = [];
        for (const ventureId of command.payload.ventureIds) {
          try {
            await this.executeCommand({
              ...command,
              type: "PauseVenture",
              payload: {
                workspaceId,
                portfolioId: command.payload.portfolioId,
                ventureId,
                reason: command.payload.reason,
              },
            });
            results.push({ ventureId, status: "paused" as const });
          } catch (err) {
            results.push({
              ventureId,
              status: "failed" as const,
              reason: err instanceof Error ? err.message : "unknown",
            });
          }
        }
        return { results };
      }

      case "ResumeVentureBatch": {
        const results = [];
        for (const ventureId of command.payload.ventureIds) {
          try {
            await this.executeCommand({
              ...command,
              type: "ResumeVenture",
              payload: {
                workspaceId,
                portfolioId: command.payload.portfolioId,
                ventureId,
                priority: command.payload.priority,
              },
            });
            results.push({ ventureId, status: "resumed" as const });
          } catch (err) {
            results.push({
              ventureId,
              status: "failed" as const,
              reason: err instanceof Error ? err.message : "unknown",
            });
          }
        }
        return { results };
      }

      case "ChangePriorityBatch": {
        const results = [];
        for (const change of command.payload.changes) {
          try {
            await this.executeCommand({
              ...command,
              type: "SetVenturePriority",
              payload: {
                workspaceId,
                portfolioId: command.payload.portfolioId,
                ventureId: change.ventureId,
                priority: change.priority,
              },
            });
            results.push({ ventureId: change.ventureId, status: "updated" as const });
          } catch (err) {
            results.push({
              ventureId: change.ventureId,
              status: "failed" as const,
              reason: err instanceof Error ? err.message : "unknown",
            });
          }
        }
        return { results };
      }

      default:
        fail({
          code: "UNSUPPORTED_COMMAND",
          message: `Unsupported portfolio command: ${command.type}`,
          category: "validation",
        });
    }
  }

  async executeQuery(query: PortfolioQuery): Promise<unknown> {
    const { ports } = this.deps;
    const actor = query.meta.actorId;
    if (!actor) {
      fail({ code: "UNAUTHORIZED", message: "Actor required", category: "authorization" });
    }
    const workspaceId = query.payload.workspaceId;
    const canAccess = await ports.authorization.canAccessWorkspace(actor, workspaceId);
    if (!canAccess) {
      fail({
        code: "WORKSPACE_FORBIDDEN",
        message: "Cannot access workspace",
        category: "authorization",
      });
    }

    const portfolioId = "portfolioId" in query.payload ? query.payload.portfolioId : undefined;
    if (!portfolioId) {
      fail({ code: "VALIDATION", message: "portfolioId required", category: "validation" });
    }

    const snap = await this.deps.store.getById(portfolioId);
    if (!snap || snap.workspaceId !== workspaceId) {
      fail({
        code: "PORTFOLIO_NOT_FOUND",
        message: `Portfolio not found: ${portfolioId}`,
        category: "not_found",
      });
    }

    const state = this.getProjection(snap);
    const ventureMap = new Map<string, import("../compat-domain").Venture>();
    for (const pv of Object.values(snap.ventures)) {
      const v = await ports.uow.ventures.getById(pv.ventureId);
      if (v) ventureMap.set(pv.ventureId, v);
    }

    switch (query.type) {
      case "GetPortfolio":
      case "GetPortfolioSummary":
        return buildPortfolioReadModel(state, ventureMap);

      case "ListPortfolioVentures":
        return listVentureCards(snap, ventureMap, state.executionCounts, {
          page: query.payload.page,
          pageSize: query.payload.pageSize,
          search: query.payload.search,
          sortBy: query.payload.sortBy,
          sortDir: query.payload.sortDir,
          lifecycle: query.payload.lifecycle,
          priority: query.payload.priority,
          health: query.payload.health,
          hasBlockers: query.payload.hasBlockers,
          activeExecutions: query.payload.activeExecutions,
        });

      case "GetPortfolioVenture": {
        const pv = snap.ventures[query.payload.ventureId];
        if (!pv) {
          fail({
            code: "VENTURE_NOT_FOUND",
            message: `Venture not in portfolio: ${query.payload.ventureId}`,
            category: "not_found",
          });
        }
        return buildPortfolioReadModel(state, ventureMap).ventures.find(
          (c) => c.ventureId === query.payload.ventureId,
        );
      }

      case "GetPortfolioAllocations":
        return Object.values(snap.allocations).filter(
          (a) => !query.payload.ventureId || a.ventureId === query.payload.ventureId,
        );

      case "GetPortfolioDependencies":
        return Object.values(snap.dependencies);

      case "GetSharedAssets":
        return Object.values(snap.sharedAssets);

      case "GetPortfolioPolicies":
        return Object.values(snap.policies);

      case "GetPortfolioDecisions":
        return Object.values(snap.decisions);

      case "GetPortfolioActivity":
        return state.activity.slice(0, query.payload.limit ?? 50);

      case "GetPortfolioCapacity":
        return buildCapacityViews(snap);

      case "GetPortfolioRisks":
        return buildRiskViews(snap);

      default:
        fail({
          code: "UNSUPPORTED_QUERY",
          message: `Unsupported portfolio query: ${(query as PortfolioQuery).type}`,
          category: "validation",
        });
    }
  }
}

export function createInMemoryPortfolioStore(): PortfolioStorePort {
  const store = new Map<string, PortfolioProps>();
  return {
    async getById(id) {
      return store.get(id) ?? null;
    },
    async listByWorkspace(workspaceId) {
      return [...store.values()].filter((p) => p.workspaceId === workspaceId);
    },
    async save(portfolio) {
      store.set(portfolio.id, structuredClone(portfolio));
    },
  };
}

export function createPortfolioService(deps: PortfolioServiceDeps): PortfolioService {
  return new PortfolioService(deps);
}
