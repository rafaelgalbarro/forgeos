/** Program 3000 Sprint 3 — Persistence layer entry point & repository factory. */

import type { PersistenceAdapter } from "./adapters/adapter-types";
import { getLocalAdapter } from "./adapters/local-adapter";
import { getPostgresAdapter } from "./adapters/postgres-adapter";
import { getSupabaseAdapter } from "./adapters/supabase-adapter";
import { resolveActiveProvider } from "./config";
import { BuildContextRepository } from "./repositories/build-context-repository";
import { BuildDnaRepository } from "./repositories/build-dna-repository";
import { CeoDecisionRepository } from "./repositories/ceo-decision-repository";
import { DepartmentRepository } from "./repositories/department-repository";
import { DocumentRepository } from "./repositories/document-repository";
import { KnowledgeHubRepository } from "./repositories/knowledge-hub-repository";
import { KnowledgeRepository } from "./repositories/knowledge-repository";
import { MemoryRepository } from "./repositories/memory-repository";
import { OrganizationRepository } from "./repositories/organization-repository";
import { RoadmapRepository } from "./repositories/roadmap-repository";
import { TaskRepository } from "./repositories/task-repository";
import { TimelineRepository } from "./repositories/timeline-repository";
import { UserRepository } from "./repositories/user-repository";
import { VentureRepository } from "./repositories/venture-repository";
import { WorkspaceRepository } from "./repositories/workspace-repository";

export * from "./types";
export * from "./config";
export { getLocalAdapter } from "./adapters/local-adapter";
export { getSupabaseAdapter } from "./adapters/supabase-adapter";
export { getPostgresAdapter } from "./adapters/postgres-adapter";
export * from "./autosave/autosave";
export * from "./sync/sync-layer";
export * from "./recovery/recovery";
export * from "./snapshots/snapshots";
export * from "./versioning/versioning";

let adapterInstance: PersistenceAdapter | null = null;

export function getPersistenceAdapter(): PersistenceAdapter {
  if (adapterInstance) return adapterInstance;

  const provider = resolveActiveProvider();
  switch (provider) {
    case "supabase":
      adapterInstance = getSupabaseAdapter();
      break;
    case "postgres":
      adapterInstance = getPostgresAdapter();
      break;
    default:
      adapterInstance = getLocalAdapter();
  }

  return adapterInstance;
}

export function resetPersistenceAdapter(): void {
  adapterInstance = null;
}

// ── Repository singletons ────────────────────────────────────────

let workspaceRepo: WorkspaceRepository | null = null;
let organizationRepo: OrganizationRepository | null = null;
let userRepo: UserRepository | null = null;
let ventureRepo: VentureRepository | null = null;
let memoryRepo: MemoryRepository | null = null;
let knowledgeRepo: KnowledgeRepository | null = null;
let knowledgeHubRepo: KnowledgeHubRepository | null = null;
let timelineRepo: TimelineRepository | null = null;
let ceoDecisionRepo: CeoDecisionRepository | null = null;
let taskRepo: TaskRepository | null = null;
let departmentRepo: DepartmentRepository | null = null;
let buildContextRepo: BuildContextRepository | null = null;
let buildDnaRepo: BuildDnaRepository | null = null;
let roadmapRepo: RoadmapRepository | null = null;
let documentRepo: DocumentRepository | null = null;

export function getWorkspaceRepository(): WorkspaceRepository {
  if (!workspaceRepo) workspaceRepo = new WorkspaceRepository(getPersistenceAdapter());
  return workspaceRepo;
}

export function getOrganizationRepository(): OrganizationRepository {
  if (!organizationRepo) organizationRepo = new OrganizationRepository(getPersistenceAdapter());
  return organizationRepo;
}

export function getUserRepository(): UserRepository {
  if (!userRepo) userRepo = new UserRepository(getPersistenceAdapter());
  return userRepo;
}

export function getVentureRepository(): VentureRepository {
  if (!ventureRepo) ventureRepo = new VentureRepository(getPersistenceAdapter());
  return ventureRepo;
}

export function getMemoryRepository(): MemoryRepository {
  if (!memoryRepo) memoryRepo = new MemoryRepository(getPersistenceAdapter());
  return memoryRepo;
}

export function getKnowledgeRepository(): KnowledgeRepository {
  if (!knowledgeRepo) knowledgeRepo = new KnowledgeRepository(getPersistenceAdapter());
  return knowledgeRepo;
}

export function getKnowledgeHubRepository(): KnowledgeHubRepository {
  if (!knowledgeHubRepo) knowledgeHubRepo = new KnowledgeHubRepository(getPersistenceAdapter());
  return knowledgeHubRepo;
}

export function getTimelineRepository(): TimelineRepository {
  if (!timelineRepo) timelineRepo = new TimelineRepository(getPersistenceAdapter());
  return timelineRepo;
}

export function getCeoDecisionRepository(): CeoDecisionRepository {
  if (!ceoDecisionRepo) ceoDecisionRepo = new CeoDecisionRepository(getPersistenceAdapter());
  return ceoDecisionRepo;
}

export function getTaskRepository(): TaskRepository {
  if (!taskRepo) taskRepo = new TaskRepository(getPersistenceAdapter());
  return taskRepo;
}

export function getDepartmentRepository(): DepartmentRepository {
  if (!departmentRepo) departmentRepo = new DepartmentRepository(getPersistenceAdapter());
  return departmentRepo;
}

export function getBuildContextRepository(): BuildContextRepository {
  if (!buildContextRepo) buildContextRepo = new BuildContextRepository(getPersistenceAdapter());
  return buildContextRepo;
}

export function getBuildDnaRepository(): BuildDnaRepository {
  if (!buildDnaRepo) buildDnaRepo = new BuildDnaRepository(getPersistenceAdapter());
  return buildDnaRepo;
}

export function getRoadmapRepository(): RoadmapRepository {
  if (!roadmapRepo) roadmapRepo = new RoadmapRepository(getPersistenceAdapter());
  return roadmapRepo;
}

export function getDocumentRepository(): DocumentRepository {
  if (!documentRepo) documentRepo = new DocumentRepository(getPersistenceAdapter());
  return documentRepo;
}
