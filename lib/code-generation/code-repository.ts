/** PROGRAM 5360 — Code project repository (in-memory + optional localStorage). */

import type { CodeFile, CodeProject, CodeProjectSummary } from "./types";
import { toFileMetadata } from "./code-project";

const memoryStore = new Map<string, CodeProject>();
const missionIndex = new Map<string, string[]>();

export interface CodeRepository {
  save(project: CodeProject): void;
  get(projectId: string): CodeProject | undefined;
  getByMission(missionId: string): CodeProject[];
  getLatestByMissionAndType(missionId: string, projectType: string): CodeProject | undefined;
  getFileContent(projectId: string, filePath: string): CodeFile | undefined;
  getProjectMetadata(projectId: string, page?: number, pageSize?: number): {
    project: Omit<CodeProject, "files"> & { files: ReturnType<typeof toFileMetadata>[] };
    totalFiles: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  } | undefined;
  listSummaries(missionId: string): CodeProjectSummary[];
}

function indexProject(project: CodeProject): void {
  memoryStore.set(project.projectId, project);
  const existing = missionIndex.get(project.missionId) ?? [];
  if (!existing.includes(project.projectId)) {
    missionIndex.set(project.missionId, [...existing, project.projectId]);
  }
}

function createRepository(): CodeRepository {
  return {
    save(project) {
      indexProject(project);
    },

    get(projectId) {
      return memoryStore.get(projectId);
    },

    getByMission(missionId) {
      const ids = missionIndex.get(missionId) ?? [];
      return ids.map((id) => memoryStore.get(id)).filter(Boolean) as CodeProject[];
    },

    getLatestByMissionAndType(missionId, projectType) {
      const projects = this.getByMission(missionId).filter((p) => p.projectType === projectType);
      return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    },

    getFileContent(projectId, filePath) {
      const project = memoryStore.get(projectId);
      return project?.files.find((f) => f.path === filePath);
    },

    getProjectMetadata(projectId, page = 1, pageSize = 50) {
      const project = memoryStore.get(projectId);
      if (!project) return undefined;

      const totalFiles = project.files.length;
      const start = (page - 1) * pageSize;
      const paged = project.files.slice(start, start + pageSize);

      const { files: _files, ...rest } = project;
      return {
        project: { ...rest, files: paged.map(toFileMetadata) },
        totalFiles,
        page,
        pageSize,
        hasMore: start + pageSize < totalFiles,
      };
    },

    listSummaries(missionId) {
      return this.getByMission(missionId).map((p) => ({
        projectId: p.projectId,
        missionId: p.missionId,
        name: p.name,
        slug: p.slug,
        projectType: p.projectType,
        version: p.version,
        status: p.status,
        fileCount: p.files.length,
        validation: p.validation?.result,
        templateId: p.templateId,
        generationMode: p.generationMode,
        updatedAt: p.updatedAt,
      }));
    },
  };
}

let repoInstance: CodeRepository | null = null;

export function getCodeRepository(): CodeRepository {
  if (!repoInstance) repoInstance = createRepository();
  return repoInstance;
}

export function seedCodeProjects(projects: CodeProject[]): void {
  const repo = getCodeRepository();
  for (const p of projects) repo.save(p);
}

export function resetCodeRepository(): void {
  memoryStore.clear();
  missionIndex.clear();
  repoInstance = null;
}

const LS_KEY = "forgeos-code-projects";

export function persistToLocalStorage(missionId: string): void {
  if (typeof window === "undefined") return;
  const repo = getCodeRepository();
  const projects = repo.getByMission(missionId);
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, CodeProject[]>;
    existing[missionId] = projects;
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
  } catch {
    /* ignore quota errors */
  }
}

export function loadFromLocalStorage(missionId: string): CodeProject[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, CodeProject[]>;
    return existing[missionId] ?? [];
  } catch {
    return [];
  }
}
