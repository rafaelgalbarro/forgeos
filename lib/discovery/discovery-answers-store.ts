import type { DiscoveryAnswerMap } from "./types";

const ANSWERS_STORAGE_KEY = "forgeos_discovery_answers";
const DRAFT_ID_KEY = "forgeos_discovery_draft_id";

interface StoredAnswers {
  projectId: string;
  answers: DiscoveryAnswerMap;
  updatedAt: string;
}

function readAll(): StoredAnswers[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ANSWERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAnswers[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: StoredAnswers[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(records));
}

export function getOrCreateDraftId(): string {
  if (typeof window === "undefined") return "draft-ssr";
  let id = localStorage.getItem(DRAFT_ID_KEY);
  if (!id) {
    id = `draft-${crypto.randomUUID()}`;
    localStorage.setItem(DRAFT_ID_KEY, id);
  }
  return id;
}

export function saveDiscoveryAnswers(projectId: string, answers: DiscoveryAnswerMap): void {
  const records = readAll().filter((r) => r.projectId !== projectId);
  records.unshift({
    projectId,
    answers,
    updatedAt: new Date().toISOString(),
  });
  writeAll(records);
}

export function getDiscoveryAnswers(projectId: string): DiscoveryAnswerMap {
  return readAll().find((r) => r.projectId === projectId)?.answers ?? {};
}

export function clearDiscoveryAnswers(projectId: string): void {
  writeAll(readAll().filter((r) => r.projectId !== projectId));
}

export function migrateDiscoveryAnswers(fromProjectId: string, toProjectId: string): void {
  const answers = getDiscoveryAnswers(fromProjectId);
  if (Object.keys(answers).length === 0) return;
  saveDiscoveryAnswers(toProjectId, answers);
  clearDiscoveryAnswers(fromProjectId);
}
