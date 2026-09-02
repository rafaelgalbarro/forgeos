/**
 * Application ports — handlers depend on these interfaces only.
 * Concrete providers (Supabase, Stripe, etc.) live outside this layer.
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

export interface ClockPort {
  now(): string;
  createId(prefix: string): string;
}

export interface IdentityPort {
  requireActor(actorId: string): Promise<{ actorId: string; roles: string[] }>;
}

export interface AuthorizationPort {
  hasRole(actorId: string, role: string): Promise<boolean>;
  canAccessWorkspace(actorId: string, workspaceId: string): Promise<boolean>;
}

export interface TelemetryPort {
  record(summary: {
    name: string;
    correlationId?: string;
    workspaceId?: string;
    ok: boolean;
    durationMs?: number;
    meta?: Record<string, string | number | boolean>;
  }): Promise<void>;
}

export interface NotificationPort {
  notify(input: {
    workspaceId: string;
    title: string;
    body: string;
    severity?: "info" | "warn" | "error";
  }): Promise<void>;
}

export interface AiPort {
  generateSummary(prompt: string): Promise<string>;
}

export interface FactoryPort {
  planOutputs(missionId: string): Promise<Array<{ kind: string; title: string }>>;
}

export interface ExecutionPort {
  /** Intentionally thin — does NOT replace Runtime engine. */
  requestExecution(input: {
    kind: string;
    missionId: string;
    correlationId?: string;
  }): Promise<{ accepted: boolean; executionId?: string }>;
}

export interface JobPort {
  enqueue(job: { type: string; payload: Record<string, unknown> }): Promise<{ jobId: string }>;
}

export interface SandboxPort {
  createPreview(missionId: string): Promise<{ previewId: string; url: string }>;
  stopPreview(previewId: string): Promise<void>;
}

export interface SourceControlPort {
  scaffoldRepo(missionId: string): Promise<{ repoUrl: string }>;
}

export interface DeploymentPort {
  deploy(input: {
    deploymentId: string;
    target: string;
  }): Promise<{ accepted: boolean }>;
  rollback(deploymentId: string): Promise<{ accepted: boolean }>;
}

export interface WorkspaceRepositoryPort {
  getById(id: string): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
}

export interface VentureRepositoryPort {
  getById(id: string): Promise<Venture | null>;
  listByWorkspace(workspaceId: string): Promise<Venture[]>;
  save(venture: Venture): Promise<void>;
}

export interface MissionRepositoryPort {
  getById(id: string): Promise<Mission | null>;
  listByWorkspace(workspaceId: string): Promise<Mission[]>;
  save(mission: Mission): Promise<void>;
}

export interface DecisionRepositoryPort {
  getById(id: string): Promise<Decision | null>;
  listByMission(missionId: string): Promise<Decision[]>;
  save(decision: Decision): Promise<void>;
}

export interface OutputRepositoryPort {
  getById(id: string): Promise<Output | null>;
  listByMission(missionId: string): Promise<Output[]>;
  save(output: Output): Promise<void>;
}

export interface CodebaseRepositoryPort {
  getById(id: string): Promise<Codebase | null>;
  findByMission(missionId: string): Promise<Codebase | null>;
  save(codebase: Codebase): Promise<void>;
}

export interface BuildRepositoryPort {
  getById(id: string): Promise<Build | null>;
  findLatestByMission(missionId: string): Promise<Build | null>;
  save(build: Build): Promise<void>;
}

export interface PreviewRepositoryPort {
  getById(id: string): Promise<Preview | null>;
  findLatestByMission(missionId: string): Promise<Preview | null>;
  save(preview: Preview): Promise<void>;
}

export interface ReleaseRepositoryPort {
  getById(id: string): Promise<Release | null>;
  save(release: Release): Promise<void>;
}

export interface DeploymentRepositoryPort {
  getById(id: string): Promise<Deployment | null>;
  save(deployment: Deployment): Promise<void>;
}

export interface EventStorePort {
  append(events: DomainEvent[]): Promise<void>;
  listByAggregate(aggregateId: string): Promise<DomainEvent[]>;
}

export interface IdempotencyStorePort {
  get(key: string): Promise<{ commandId: string; resultJson: string } | null>;
  put(key: string, commandId: string, resultJson: string): Promise<void>;
}

/**
 * Unit of work / transaction boundary.
 *
 * Limitation: current ForgeOS persistence (localStorage / repository adapters)
 * does not provide true multi-entity ACID transactions. Implementations should
 * best-effort batch writes and roll back in-memory staged changes on failure.
 * Avoid partial commits: Mission+Event, Output+Mission, Release+Approval must
 * succeed together within a single commit() call.
 */
export interface UnitOfWorkPort {
  workspaces: WorkspaceRepositoryPort;
  ventures: VentureRepositoryPort;
  missions: MissionRepositoryPort;
  decisions: DecisionRepositoryPort;
  outputs: OutputRepositoryPort;
  codebases: CodebaseRepositoryPort;
  builds: BuildRepositoryPort;
  previews: PreviewRepositoryPort;
  releases: ReleaseRepositoryPort;
  deployments: DeploymentRepositoryPort;
  events: EventStorePort;
  idempotency: IdempotencyStorePort;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface ApplicationPorts {
  clock: ClockPort;
  identity: IdentityPort;
  authorization: AuthorizationPort;
  telemetry: TelemetryPort;
  notifications: NotificationPort;
  ai: AiPort;
  factories: FactoryPort;
  execution: ExecutionPort;
  jobs: JobPort;
  sandbox: SandboxPort;
  sourceControl: SourceControlPort;
  deployment: DeploymentPort;
  uow: UnitOfWorkPort;
}

export * from "./broker-engine";
