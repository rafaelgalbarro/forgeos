/**
 * Portfolio aggregate root — PROGRAM 6110
 */

import {
  asPortfolioId,
  type PortfolioId,
  type SharedAssetId,
  type VentureId,
  type WorkspaceId,
} from "../shared/ids";
import { DomainError } from "../shared/errors";
import { Metadata, type Metadata as MetadataType } from "../shared/metadata";
import { err, ok, type Result } from "../shared/result";
import {
  CURRENT_SCHEMA_VERSION,
  nowTimestamp,
  type IsoTimestamp,
  type SchemaVersion,
} from "../shared/value-objects";
import { canTransitionLifecycle } from "./lifecycle";
import type {
  LifecycleTransitionRecord,
  PortfolioDecision,
  PortfolioPolicy,
  PortfolioStatus,
  PortfolioVenture,
  ResourceAllocation,
  SharedAsset,
  VentureDependency,
  VentureLifecycle,
  VenturePriority,
} from "./types";

export type PortfolioProps = Readonly<{
  id: PortfolioId;
  workspaceId: WorkspaceId;
  name: string;
  slug: string;
  status: PortfolioStatus;
  ventures: Readonly<Record<string, PortfolioVenture>>;
  allocations: Readonly<Record<string, ResourceAllocation>>;
  dependencies: Readonly<Record<string, VentureDependency>>;
  sharedAssets: Readonly<Record<string, SharedAsset>>;
  policies: Readonly<Record<string, PortfolioPolicy>>;
  decisions: Readonly<Record<string, PortfolioDecision>>;
  workspaceLimits: Readonly<Record<string, number>>;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreatePortfolioInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  slug: string;
  workspaceLimits?: Record<string, number>;
  now?: IsoTimestamp;
}>;

export type AddVentureInput = Readonly<{
  ventureId: VentureId;
  priority?: VenturePriority;
  lifecycle?: VentureLifecycle;
  now?: IsoTimestamp;
}>;

export class Portfolio {
  private constructor(readonly props: PortfolioProps) {}

  get id(): PortfolioId {
    return this.props.id;
  }

  get workspaceId(): WorkspaceId {
    return this.props.workspaceId;
  }

  static create(input: CreatePortfolioInput): Result<Portfolio, DomainError> {
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();
    if (!name) return err(DomainError.invariant("Portfolio", "name required"));
    if (!slug) return err(DomainError.invariant("Portfolio", "slug required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Portfolio({
        id: asPortfolioId(input.id),
        workspaceId: input.workspaceId,
        name,
        slug,
        status: "ACTIVE",
        ventures: {},
        allocations: {},
        dependencies: {},
        sharedAssets: {},
        policies: {},
        decisions: {},
        workspaceLimits: input.workspaceLimits ?? {},
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      }),
    );
  }

  static rehydrate(props: PortfolioProps): Portfolio {
    return new Portfolio(props);
  }

  private touch(
    patch: Partial<PortfolioProps>,
    now: IsoTimestamp = nowTimestamp(),
  ): Portfolio {
    return new Portfolio({ ...this.props, ...patch, updatedAt: now });
  }

  getVenture(ventureId: VentureId): PortfolioVenture | undefined {
    return this.props.ventures[ventureId];
  }

  listVentures(): PortfolioVenture[] {
    return Object.values(this.props.ventures);
  }

  addVenture(input: AddVentureInput): Result<Portfolio, DomainError> {
    if (this.props.ventures[input.ventureId]) {
      return ok(this);
    }
    const maxActive = this.getPolicyLimit("MAX_ACTIVE_VENTURES");
    if (maxActive !== undefined) {
      const active = this.listVentures().filter((v) => !v.closed && !v.archived).length;
      if (active >= maxActive) {
        return err(
          DomainError.invariant("Portfolio", `max active ventures (${maxActive}) exceeded`),
        );
      }
    }
    const ts = input.now ?? nowTimestamp();
    const lifecycle = input.lifecycle ?? "IDEA";
    const venture: PortfolioVenture = {
      ventureId: input.ventureId,
      priority: input.priority ?? "NORMAL",
      lifecycle,
      paused: false,
      archived: false,
      closed: false,
      addedAt: ts,
      updatedAt: ts,
      lifecycleHistory: [
        {
          actorId: "system",
          reason: "venture added to portfolio",
          previousState: lifecycle,
          newState: lifecycle,
          timestamp: ts,
        },
      ],
    };
    return ok(
      this.touch({
        ventures: { ...this.props.ventures, [input.ventureId]: venture },
      }, ts),
    );
  }

  removeVenture(ventureId: VentureId, now?: IsoTimestamp): Result<Portfolio, DomainError> {
    if (!this.props.ventures[ventureId]) {
      return err(DomainError.notFound("PortfolioVenture", ventureId));
    }
    const { [ventureId]: _, ...rest } = this.props.ventures;
    return ok(this.touch({ ventures: rest }, now));
  }

  setPriority(
    ventureId: VentureId,
    priority: VenturePriority,
    now?: IsoTimestamp,
  ): Result<Portfolio, DomainError> {
    const v = this.props.ventures[ventureId];
    if (!v) return err(DomainError.notFound("PortfolioVenture", ventureId));
    if (v.closed) return err(DomainError.invariant("Portfolio", "closed venture cannot change priority"));
    const ts = now ?? nowTimestamp();
    const updated: PortfolioVenture = {
      ...v,
      priority,
      paused: priority === "PAUSED" ? true : v.paused,
      updatedAt: ts,
    };
    return ok(
      this.touch({ ventures: { ...this.props.ventures, [ventureId]: updated } }, ts),
    );
  }

  setLifecycle(
    ventureId: VentureId,
    lifecycle: VentureLifecycle,
    transition: Omit<LifecycleTransitionRecord, "previousState" | "newState" | "timestamp">,
    now?: IsoTimestamp,
  ): Result<Portfolio, DomainError> {
    const v = this.props.ventures[ventureId];
    if (!v) return err(DomainError.notFound("PortfolioVenture", ventureId));
    if (v.closed) {
      return err(DomainError.invariant("Portfolio", "closed venture cannot change lifecycle"));
    }
    if (!canTransitionLifecycle(v.lifecycle, lifecycle)) {
      return err(DomainError.invalidTransition("VentureLifecycle", v.lifecycle, lifecycle));
    }
    const ts = now ?? nowTimestamp();
    const record: LifecycleTransitionRecord = {
      ...transition,
      previousState: v.lifecycle,
      newState: lifecycle,
      timestamp: ts,
    };
    const updated: PortfolioVenture = {
      ...v,
      lifecycle,
      paused: lifecycle === "PAUSED",
      updatedAt: ts,
      lifecycleHistory: [...v.lifecycleHistory, record],
    };
    return ok(
      this.touch({ ventures: { ...this.props.ventures, [ventureId]: updated } }, ts),
    );
  }

  pauseVenture(
    ventureId: VentureId,
    actorId: string,
    reason: string,
    now?: IsoTimestamp,
  ): Result<Portfolio, DomainError> {
    const v = this.props.ventures[ventureId];
    if (!v) return err(DomainError.notFound("PortfolioVenture", ventureId));
    if (v.closed) return err(DomainError.invariant("Portfolio", "closed venture cannot pause"));
    if (v.paused) return ok(this);
    const ts = now ?? nowTimestamp();
    const updated: PortfolioVenture = {
      ...v,
      paused: true,
      priority: "PAUSED",
      updatedAt: ts,
    };
    return ok(
      this.touch({ ventures: { ...this.props.ventures, [ventureId]: updated } }, ts),
    );
  }

  resumeVenture(
    ventureId: VentureId,
    priority: VenturePriority,
    now?: IsoTimestamp,
  ): Result<Portfolio, DomainError> {
    const v = this.props.ventures[ventureId];
    if (!v) return err(DomainError.notFound("PortfolioVenture", ventureId));
    if (v.closed) return err(DomainError.invariant("Portfolio", "closed venture cannot resume"));
    if (!v.paused && v.priority !== "PAUSED") return ok(this);
    const ts = now ?? nowTimestamp();
    const updated: PortfolioVenture = {
      ...v,
      paused: false,
      priority,
      updatedAt: ts,
    };
    return ok(
      this.touch({ ventures: { ...this.props.ventures, [ventureId]: updated } }, ts),
    );
  }

  archiveVenture(ventureId: VentureId, now?: IsoTimestamp): Result<Portfolio, DomainError> {
    const v = this.props.ventures[ventureId];
    if (!v) return err(DomainError.notFound("PortfolioVenture", ventureId));
    const ts = now ?? nowTimestamp();
    const updated: PortfolioVenture = { ...v, archived: true, paused: true, updatedAt: ts };
    return ok(
      this.touch({ ventures: { ...this.props.ventures, [ventureId]: updated } }, ts),
    );
  }

  closeVenture(ventureId: VentureId, now?: IsoTimestamp): Result<Portfolio, DomainError> {
    const v = this.props.ventures[ventureId];
    if (!v) return err(DomainError.notFound("PortfolioVenture", ventureId));
    const ts = now ?? nowTimestamp();
    const updated: PortfolioVenture = {
      ...v,
      closed: true,
      paused: true,
      lifecycle: "CLOSED",
      updatedAt: ts,
    };
    return ok(
      this.touch({ ventures: { ...this.props.ventures, [ventureId]: updated } }, ts),
    );
  }

  allocateResource(
    allocation: ResourceAllocation,
    now?: IsoTimestamp,
  ): Result<Portfolio, DomainError> {
    if (!this.props.ventures[allocation.ventureId]) {
      return err(DomainError.notFound("PortfolioVenture", allocation.ventureId));
    }
    const workspaceLimit = this.props.workspaceLimits[allocation.resourceType];
    if (workspaceLimit !== undefined) {
      const totalCommitted = Object.values(this.props.allocations)
        .filter((a) => a.resourceType === allocation.resourceType && a.status !== "RELEASED")
        .reduce((sum, a) => sum + a.limit, 0);
      if (totalCommitted + allocation.limit > workspaceLimit) {
        return err(
          DomainError.invariant(
            "Portfolio",
            `allocation exceeds workspace limit for ${allocation.resourceType}`,
          ),
        );
      }
    }
    const ts = now ?? nowTimestamp();
    return ok(
      this.touch({
        allocations: { ...this.props.allocations, [allocation.id]: allocation },
      }, ts),
    );
  }

  releaseAllocation(allocationId: string, now?: IsoTimestamp): Result<Portfolio, DomainError> {
    const alloc = this.props.allocations[allocationId];
    if (!alloc) return err(DomainError.notFound("ResourceAllocation", allocationId));
    const ts = now ?? nowTimestamp();
    const released: ResourceAllocation = {
      ...alloc,
      status: "RELEASED",
      used: 0,
      reserved: 0,
      available: alloc.limit,
      updatedAt: ts,
    };
    return ok(
      this.touch({
        allocations: { ...this.props.allocations, [allocationId]: released },
      }, ts),
    );
  }

  addDependency(dep: VentureDependency): Result<Portfolio, DomainError> {
    if (!this.props.ventures[dep.sourceVentureId]) {
      return err(DomainError.notFound("PortfolioVenture", dep.sourceVentureId));
    }
    if (!this.props.ventures[dep.targetVentureId]) {
      return err(DomainError.notFound("PortfolioVenture", dep.targetVentureId));
    }
    if (this.hasCircularDependency(dep.sourceVentureId, dep.targetVentureId)) {
      return err(DomainError.invariant("Portfolio", "circular dependency detected"));
    }
    return ok(
      this.touch({
        dependencies: { ...this.props.dependencies, [dep.id]: dep },
      }),
    );
  }

  removeDependency(depId: string): Result<Portfolio, DomainError> {
    if (!this.props.dependencies[depId]) {
      return err(DomainError.notFound("VentureDependency", depId));
    }
    const { [depId]: _, ...rest } = this.props.dependencies;
    return ok(this.touch({ dependencies: rest }));
  }

  registerSharedAsset(asset: SharedAsset): Result<Portfolio, DomainError> {
    if (!this.props.ventures[asset.ownerVentureId]) {
      return err(DomainError.notFound("PortfolioVenture", asset.ownerVentureId));
    }
    for (const consumerId of asset.allowedConsumerIds) {
      if (!this.props.ventures[consumerId]) {
        return err(DomainError.notFound("PortfolioVenture", consumerId));
      }
    }
    return ok(
      this.touch({
        sharedAssets: { ...this.props.sharedAssets, [asset.id]: asset },
      }),
    );
  }

  approveSharedAssetUsage(
    assetId: SharedAssetId,
    consumerId: VentureId,
    now?: IsoTimestamp,
  ): Result<Portfolio, DomainError> {
    const asset = this.props.sharedAssets[assetId];
    if (!asset) return err(DomainError.notFound("SharedAsset", assetId));
    if (!asset.allowedConsumerIds.includes(consumerId)) {
      return err(
        DomainError.invariant("Portfolio", "consumer not in allowed list — explicit permission required"),
      );
    }
    const ts = now ?? nowTimestamp();
    const updated: SharedAsset = {
      ...asset,
      approvalStatus: "APPROVED",
      updatedAt: ts,
    };
    return ok(
      this.touch({
        sharedAssets: { ...this.props.sharedAssets, [assetId]: updated },
      }, ts),
    );
  }

  upsertPolicy(policy: PortfolioPolicy): Result<Portfolio, DomainError> {
    return ok(
      this.touch({
        policies: { ...this.props.policies, [policy.id]: policy },
      }),
    );
  }

  recordDecision(decision: PortfolioDecision): Result<Portfolio, DomainError> {
    return ok(
      this.touch({
        decisions: { ...this.props.decisions, [decision.id]: decision },
      }),
    );
  }

  canStartMission(ventureId: VentureId): boolean {
    const v = this.props.ventures[ventureId];
    if (!v) return false;
    if (v.closed || v.archived) return false;
    return true;
  }

  canStartAutomaticTasks(ventureId: VentureId): boolean {
    const v = this.props.ventures[ventureId];
    if (!v) return false;
    if (v.paused || v.closed || v.archived) return false;
    return true;
  }

  private getPolicyLimit(kind: string): number | undefined {
    const policy = Object.values(this.props.policies).find(
      (p) => p.enabled && p.kind === kind,
    );
    if (!policy) return undefined;
    const limit = policy.config.limit;
    return typeof limit === "number" ? limit : undefined;
  }

  private hasCircularDependency(source: VentureId, target: VentureId): boolean {
    const visited = new Set<string>();
    const stack = [target];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === source) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const dep of Object.values(this.props.dependencies)) {
        if (dep.sourceVentureId === current) {
          stack.push(dep.targetVentureId);
        }
      }
    }
    return false;
  }

  toSnapshot(): PortfolioProps {
    return this.props;
  }
}
