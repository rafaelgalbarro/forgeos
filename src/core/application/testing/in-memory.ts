/**
 * In-memory / noop adapters for tests.
 * Real Supabase / Runtime providers are NOT required for Program 6020.
 */

import type {
  Build,
  Codebase,
  Decision,
  Deployment,
  DomainEvent,
  Mission,
  Output,
  Preview,
  Release,
  Venture,
  Workspace,
} from "../compat-domain";
import type {
  ApplicationPorts,
  BuildRepositoryPort,
  ClockPort,
  CodebaseRepositoryPort,
  DecisionRepositoryPort,
  DeploymentRepositoryPort,
  EventStorePort,
  IdempotencyStorePort,
  MissionRepositoryPort,
  OutputRepositoryPort,
  PreviewRepositoryPort,
  ReleaseRepositoryPort,
  UnitOfWorkPort,
  VentureRepositoryPort,
  WorkspaceRepositoryPort,
} from "../ports";

function mapRepo<T extends { id: string }>(store: Map<string, T>) {
  return {
    async getById(id: string) {
      return store.get(id) ?? null;
    },
    async save(entity: T) {
      store.set(entity.id, structuredClone(entity));
    },
  };
}

export interface InMemoryStore {
  workspaces: Map<string, Workspace>;
  ventures: Map<string, Venture>;
  missions: Map<string, Mission>;
  decisions: Map<string, Decision>;
  outputs: Map<string, Output>;
  codebases: Map<string, Codebase>;
  builds: Map<string, Build>;
  previews: Map<string, Preview>;
  releases: Map<string, Release>;
  deployments: Map<string, Deployment>;
  events: DomainEvent[];
  idempotency: Map<string, { commandId: string; resultJson: string }>;
  /** When true, commit() throws to simulate transaction failure. */
  failNextCommit?: boolean;
  /** When true, repository save throws. */
  failNextSave?: boolean;
}

export function createInMemoryStore(): InMemoryStore {
  return {
    workspaces: new Map(),
    ventures: new Map(),
    missions: new Map(),
    decisions: new Map(),
    outputs: new Map(),
    codebases: new Map(),
    builds: new Map(),
    previews: new Map(),
    releases: new Map(),
    deployments: new Map(),
    events: [],
    idempotency: new Map(),
  };
}

export function createInMemoryUnitOfWork(store: InMemoryStore): UnitOfWorkPort {
  let staging: InMemoryStore | null = null;
  let seq = 0;

  const wrapSave = <T extends { id: string }>(
    target: Map<string, T>,
    entity: T,
  ) => {
    if (store.failNextSave) {
      store.failNextSave = false;
      throw new Error("repository failure: save rejected");
    }
    target.set(entity.id, structuredClone(entity));
  };

  const active = () => staging ?? store;

  const workspaces: WorkspaceRepositoryPort = {
    async getById(id) {
      return active().workspaces.get(id) ?? null;
    },
    async save(workspace) {
      wrapSave(active().workspaces, workspace);
    },
  };

  const ventures: VentureRepositoryPort = {
    async getById(id) {
      return active().ventures.get(id) ?? null;
    },
    async listByWorkspace(workspaceId) {
      return [...active().ventures.values()].filter((v) => v.workspaceId === workspaceId);
    },
    async save(venture) {
      wrapSave(active().ventures, venture);
    },
  };

  const missions: MissionRepositoryPort = {
    async getById(id) {
      return active().missions.get(id) ?? null;
    },
    async listByWorkspace(workspaceId) {
      return [...active().missions.values()].filter((m) => m.workspaceId === workspaceId);
    },
    async save(mission) {
      wrapSave(active().missions, mission);
    },
  };

  const decisions: DecisionRepositoryPort = {
    async getById(id) {
      return active().decisions.get(id) ?? null;
    },
    async listByMission(missionId) {
      return [...active().decisions.values()].filter((d) => d.missionId === missionId);
    },
    async save(decision) {
      wrapSave(active().decisions, decision);
    },
  };

  const outputs: OutputRepositoryPort = {
    async getById(id) {
      return active().outputs.get(id) ?? null;
    },
    async listByMission(missionId) {
      return [...active().outputs.values()].filter((o) => o.missionId === missionId);
    },
    async save(output) {
      wrapSave(active().outputs, output);
    },
  };

  const codebases: CodebaseRepositoryPort = {
    async getById(id) {
      return active().codebases.get(id) ?? null;
    },
    async findByMission(missionId) {
      return [...active().codebases.values()].find((c) => c.missionId === missionId) ?? null;
    },
    async save(codebase) {
      wrapSave(active().codebases, codebase);
    },
  };

  const builds: BuildRepositoryPort = {
    async getById(id) {
      return active().builds.get(id) ?? null;
    },
    async findLatestByMission(missionId) {
      const list = [...active().builds.values()]
        .filter((b) => b.missionId === missionId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return list[0] ?? null;
    },
    async save(build) {
      wrapSave(active().builds, build);
    },
  };

  const previews: PreviewRepositoryPort = {
    async getById(id) {
      return active().previews.get(id) ?? null;
    },
    async findLatestByMission(missionId) {
      const list = [...active().previews.values()]
        .filter((p) => p.missionId === missionId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return list[0] ?? null;
    },
    async save(preview) {
      wrapSave(active().previews, preview);
    },
  };

  const releases: ReleaseRepositoryPort = {
    async getById(id) {
      return active().releases.get(id) ?? null;
    },
    async save(release) {
      wrapSave(active().releases, release);
    },
  };

  const deployments: DeploymentRepositoryPort = {
    async getById(id) {
      return active().deployments.get(id) ?? null;
    },
    async save(deployment) {
      wrapSave(active().deployments, deployment);
    },
  };

  const events: EventStorePort = {
    async append(list) {
      active().events.push(...list.map((e) => structuredClone(e)));
    },
    async listByAggregate(aggregateId) {
      return active().events.filter((e) => e.aggregateId === aggregateId);
    },
  };

  const idempotency: IdempotencyStorePort = {
    async get(key) {
      return active().idempotency.get(key) ?? null;
    },
    async put(key, commandId, resultJson) {
      active().idempotency.set(key, { commandId, resultJson });
    },
  };

  return {
    workspaces,
    ventures,
    missions,
    decisions,
    outputs,
    codebases,
    builds,
    previews,
    releases,
    deployments,
    events,
    idempotency,
    async begin() {
      staging = {
        workspaces: new Map(store.workspaces),
        ventures: new Map(store.ventures),
        missions: new Map(store.missions),
        decisions: new Map(store.decisions),
        outputs: new Map(store.outputs),
        codebases: new Map(store.codebases),
        builds: new Map(store.builds),
        previews: new Map(store.previews),
        releases: new Map(store.releases),
        deployments: new Map(store.deployments),
        events: [...store.events],
        idempotency: new Map(store.idempotency),
        failNextCommit: store.failNextCommit,
        failNextSave: store.failNextSave,
      };
      seq += 1;
      void seq;
    },
    async commit() {
      if (!staging) throw new Error("transaction: commit without begin");
      if (store.failNextCommit || staging.failNextCommit) {
        store.failNextCommit = false;
        staging = null;
        throw new Error("transaction failure: commit rejected");
      }
      store.workspaces = staging.workspaces;
      store.ventures = staging.ventures;
      store.missions = staging.missions;
      store.decisions = staging.decisions;
      store.outputs = staging.outputs;
      store.codebases = staging.codebases;
      store.builds = staging.builds;
      store.previews = staging.previews;
      store.releases = staging.releases;
      store.deployments = staging.deployments;
      store.events = staging.events;
      store.idempotency = staging.idempotency;
      staging = null;
    },
    async rollback() {
      staging = null;
    },
  };
}

export function createStubClock(fixed?: string): ClockPort {
  let n = 0;
  return {
    now: () => fixed ?? new Date().toISOString(),
    createId: (prefix) => {
      n += 1;
      return `${prefix}-${n}`;
    },
  };
}

export function createTestPorts(options?: {
  store?: InMemoryStore;
  roles?: string[];
  denyWorkspace?: boolean;
}): { ports: ApplicationPorts; store: InMemoryStore; telemetry: Array<Record<string, unknown>> } {
  const store = options?.store ?? createInMemoryStore();
  const uow = createInMemoryUnitOfWork(store);
  const telemetry: Array<Record<string, unknown>> = [];
  const roles = options?.roles ?? ["founder", "owner"];

  const ports: ApplicationPorts = {
    clock: createStubClock("2026-07-24T12:00:00.000Z"),
    identity: {
      async requireActor(actorId) {
        if (!actorId) throw new Error("Actor identity required");
        return { actorId, roles };
      },
    },
    authorization: {
      async hasRole(actorId, role) {
        void actorId;
        return roles.includes(role);
      },
      async canAccessWorkspace(actorId, workspaceId) {
        void actorId;
        void workspaceId;
        return !options?.denyWorkspace;
      },
    },
    telemetry: {
      async record(summary) {
        telemetry.push(summary);
      },
    },
    notifications: {
      async notify() {
        /* noop */
      },
    },
    ai: {
      async generateSummary(prompt) {
        return `AI summary: ${prompt.slice(0, 80)}`;
      },
    },
    factories: {
      async planOutputs(missionId) {
        return [{ kind: "brief", title: `Brief for ${missionId}` }];
      },
    },
    execution: {
      async requestExecution() {
        return { accepted: true, executionId: "exec-stub" };
      },
    },
    jobs: {
      async enqueue(job) {
        return { jobId: `job-${job.type}` };
      },
    },
    sandbox: {
      async createPreview(missionId) {
        return { previewId: `prev-${missionId}`, url: `https://preview.local/${missionId}` };
      },
      async stopPreview() {
        /* noop */
      },
    },
    sourceControl: {
      async scaffoldRepo(missionId) {
        return { repoUrl: `https://git.local/${missionId}` };
      },
    },
    deployment: {
      async deploy() {
        return { accepted: true };
      },
      async rollback() {
        return { accepted: true };
      },
    },
    uow,
  };

  return { ports, store, telemetry };
}
