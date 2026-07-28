/** Program 3000 Sprint 3 — Venture Persistence entity types & repository interfaces. */

import type { AuthUser } from "@/lib/auth/types";
import type { BuildContext } from "@/lib/build-platform/build-context/types";
import type { BuildDna } from "@/lib/build-platform/build-dna/types";
import type { VentureProject } from "@/lib/domain/venture";
import type { KnowledgeEntryBase } from "@/lib/knowledge/types";
import type { KnowledgeHubIndex } from "@/lib/knowledge-hub/types";
import type {
  CeoMemory,
  Decision,
  VentureMemoryRecord,
} from "@/lib/intelligence-layer/types";
import type { OrganizationSnapshot } from "@/lib/autonomous-organization/types";
import type { SchedulerTask } from "@/lib/runtime/scheduler/types";
import type { TimelineEvent } from "@/lib/venture-timeline/types";
import type {
  UserPreferences,
  Workspace,
  WorkspaceOrganization,
} from "@/lib/workspace/types";
import type { StoredAuthUser } from "@/lib/workspace/store";

// ── Provider & metadata ──────────────────────────────────────────

export type PersistenceProvider = "local" | "supabase" | "postgres";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

export interface PersistenceMeta {
  version: number;
  provider: PersistenceProvider;
  lastSavedAt: string | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
}

export interface EntityVersion {
  entityType: string;
  entityId: string;
  version: number;
  snapshot: unknown;
  createdAt: string;
}

export interface PersistenceSnapshot {
  id: string;
  label: string;
  createdAt: string;
  provider: PersistenceProvider;
  entities: Record<string, unknown>;
}

// ── Storage keys (backward-compatible with existing stores) ────────

export const PERSISTENCE_KEYS = {
  workspaces: "forgeos-workspaces",
  organizations: "forgeos-organizations",
  users: "forgeos-auth-users",
  preferences: "forgeos-user-preferences",
  ventures: "forgeos-ventures",
  ventureMemory: "forgeos-intelligence-venture-memory",
  decisions: "forgeos-intelligence-decisions",
  ceoMemory: "forgeos-intelligence-ceo-memory",
  knowledge: "forgeos-persist-knowledge",
  knowledgeHub: "forgeos-persist-knowledge-hub",
  timeline: "forgeos-persist-timeline",
  tasks: "forgeos-persist-tasks",
  departments: "forgeos-autonomous-organization",
  buildContext: "forgeos-persist-build-context",
  buildDna: "forgeos-persist-build-dna",
  roadmaps: "forgeos-persist-roadmaps",
  documents: "forgeos-persist-documents",
  meta: "forgeos-persist-meta",
  versions: "forgeos-persist-versions",
  snapshots: "forgeos-persist-snapshots",
} as const;

export type PersistenceKey = (typeof PERSISTENCE_KEYS)[keyof typeof PERSISTENCE_KEYS];

// ── Domain entity aliases ────────────────────────────────────────

export type PersistedUser = StoredAuthUser;
export type PersistedFounder = AuthUser;
export type PersistedVenture = VentureProject;
export type PersistedMemory = VentureMemoryRecord;
export type PersistedKnowledge = KnowledgeEntryBase;
export type PersistedTimeline = TimelineEvent;
export type PersistedCeoDecision = Decision;
export type PersistedTask = SchedulerTask;
export type PersistedDepartment = OrganizationSnapshot;
export type PersistedRoadmap = {
  id: string;
  ventureId: string;
  title: string;
  quarter: string;
  status: "planned" | "in_progress" | "done";
  category: string;
  content?: string;
  updatedAt: string;
};
export type PersistedDocument = {
  id: string;
  ventureId: string;
  title: string;
  content: string;
  format: "markdown" | "code" | "json";
  category: string;
  updatedAt: string;
};

// ── Base repository contract ─────────────────────────────────────

export interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

export interface ScopedRepository<T, ScopeKey extends string = string> {
  findByScope(scopeKey: ScopeKey, scopeId: string): Promise<T[]>;
  findOneByScope(scopeKey: ScopeKey, scopeId: string): Promise<T | null>;
  saveScoped(scopeKey: ScopeKey, scopeId: string, entity: T): Promise<T>;
  deleteScoped(scopeKey: ScopeKey, scopeId: string, entityId: string): Promise<boolean>;
}

// ── Domain repository interfaces ─────────────────────────────────

export interface IWorkspaceRepository extends Repository<Workspace> {
  findByOwner(ownerId: string): Promise<Workspace[]>;
  findByOrganization(organizationId: string): Promise<Workspace[]>;
}

export interface IOrganizationRepository extends Repository<WorkspaceOrganization> {
  findByOwner(ownerId: string): Promise<WorkspaceOrganization[]>;
  findBySlug(slug: string): Promise<WorkspaceOrganization | null>;
}

export interface IUserRepository {
  findById(id: string): Promise<PersistedUser | null>;
  findByEmail(email: string): Promise<PersistedUser | null>;
  findAll(): Promise<PersistedUser[]>;
  save(user: PersistedUser): Promise<PersistedUser>;
  delete(id: string): Promise<boolean>;
  getPreferences(userId: string): Promise<UserPreferences>;
  savePreferences(userId: string, prefs: UserPreferences): Promise<void>;
}

export interface IVentureRepository extends Repository<VentureProject> {
  findByWorkspace(workspaceId: string, ventureIds: string[]): Promise<VentureProject[]>;
}

export interface IMemoryRepository {
  getByVenture(ventureId: string): Promise<VentureMemoryRecord | null>;
  save(record: VentureMemoryRecord): Promise<VentureMemoryRecord>;
  getAll(): Promise<VentureMemoryRecord[]>;
  delete(ventureId: string): Promise<boolean>;
}

export interface IKnowledgeRepository extends Repository<KnowledgeEntryBase> {
  query(filter: { domain?: string; search?: string; limit?: number }): Promise<KnowledgeEntryBase[]>;
}

export interface IKnowledgeHubRepository {
  getByVenture(ventureId: string): Promise<KnowledgeHubIndex | null>;
  save(index: KnowledgeHubIndex): Promise<KnowledgeHubIndex>;
  delete(ventureId: string): Promise<boolean>;
}

export interface ITimelineRepository {
  getByVenture(ventureId: string): Promise<TimelineEvent[]>;
  saveEvents(ventureId: string, events: TimelineEvent[]): Promise<TimelineEvent[]>;
  appendEvent(event: TimelineEvent): Promise<TimelineEvent>;
  deleteByVenture(ventureId: string): Promise<boolean>;
}

export interface ICeoDecisionRepository {
  getByVenture(ventureId: string): Promise<Decision[]>;
  save(decision: Decision): Promise<Decision>;
  getAll(): Promise<Decision[]>;
  getCeoMemory(): Promise<CeoMemory>;
  saveCeoMemory(memory: CeoMemory): Promise<CeoMemory>;
}

export interface ITaskRepository extends Repository<SchedulerTask> {
  findByVenture(ventureId: string): Promise<SchedulerTask[]>;
  findByStatus(status: SchedulerTask["status"]): Promise<SchedulerTask[]>;
}

export interface IDepartmentRepository {
  getByVenture(ventureId: string): Promise<OrganizationSnapshot | null>;
  save(ventureId: string, snapshot: OrganizationSnapshot): Promise<OrganizationSnapshot>;
  delete(ventureId: string): Promise<boolean>;
}

export interface IBuildContextRepository {
  getByVenture(ventureId: string): Promise<BuildContext | null>;
  save(context: BuildContext): Promise<BuildContext>;
  delete(ventureId: string): Promise<boolean>;
  listAll(): Promise<BuildContext[]>;
}

export interface IBuildDnaRepository {
  getByVenture(ventureId: string): Promise<BuildDna | null>;
  save(dna: BuildDna): Promise<BuildDna>;
  delete(ventureId: string): Promise<boolean>;
}

export interface IRoadmapRepository extends Repository<PersistedRoadmap> {
  findByVenture(ventureId: string): Promise<PersistedRoadmap[]>;
}

export interface IDocumentRepository extends Repository<PersistedDocument> {
  findByVenture(ventureId: string): Promise<PersistedDocument[]>;
}
