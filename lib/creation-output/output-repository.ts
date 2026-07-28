/** PROGRAM 5350 — Repository pattern for creation outputs (localStorage). */

import type { ChangeRequest, CreationOutput, VersionComparison } from "./types";

const STORAGE_KEY = "forgeos-creation-outputs-v5350";
const CHANGE_REQUESTS_KEY = "forgeos-creation-change-requests-v5350";
const COMPARISONS_KEY = "forgeos-creation-comparisons-v5350";

export interface OutputRepository {
  findById(outputId: string): CreationOutput | null;
  findByMission(missionId: string): CreationOutput[];
  findByMissionAndType(missionId: string, type: CreationOutput["type"]): CreationOutput[];
  save(output: CreationOutput): void;
  saveAll(outputs: CreationOutput[]): void;
  delete(outputId: string): void;
  getChangeRequests(missionId: string): ChangeRequest[];
  saveChangeRequest(cr: ChangeRequest): void;
  getComparisons(missionId: string): VersionComparison[];
  saveComparison(comp: VersionComparison): void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

class LocalStorageOutputRepository implements OutputRepository {
  private readOutputs(): CreationOutput[] {
    return readJson<CreationOutput[]>(STORAGE_KEY, []);
  }

  private writeOutputs(outputs: CreationOutput[]): void {
    writeJson(STORAGE_KEY, outputs);
  }

  findById(outputId: string): CreationOutput | null {
    return this.readOutputs().find((o) => o.outputId === outputId) ?? null;
  }

  findByMission(missionId: string): CreationOutput[] {
    return this.readOutputs()
      .filter((o) => o.missionId === missionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  findByMissionAndType(missionId: string, type: CreationOutput["type"]): CreationOutput[] {
    return this.findByMission(missionId).filter((o) => o.type === type);
  }

  save(output: CreationOutput): void {
    const all = this.readOutputs();
    const idx = all.findIndex((o) => o.outputId === output.outputId);
    if (idx >= 0) all[idx] = output;
    else all.push(output);
    this.writeOutputs(all);
  }

  saveAll(outputs: CreationOutput[]): void {
    const all = this.readOutputs();
    for (const output of outputs) {
      const idx = all.findIndex((o) => o.outputId === output.outputId);
      if (idx >= 0) all[idx] = output;
      else all.push(output);
    }
    this.writeOutputs(all);
  }

  delete(outputId: string): void {
    this.writeOutputs(this.readOutputs().filter((o) => o.outputId !== outputId));
  }

  getChangeRequests(missionId: string): ChangeRequest[] {
    return readJson<ChangeRequest[]>(CHANGE_REQUESTS_KEY, []).filter(
      (cr) => cr.missionId === missionId
    );
  }

  saveChangeRequest(cr: ChangeRequest): void {
    const all = readJson<ChangeRequest[]>(CHANGE_REQUESTS_KEY, []);
    const idx = all.findIndex((c) => c.id === cr.id);
    if (idx >= 0) all[idx] = cr;
    else all.push(cr);
    writeJson(CHANGE_REQUESTS_KEY, all);
  }

  getComparisons(missionId: string): VersionComparison[] {
    return readJson<VersionComparison[]>(COMPARISONS_KEY, []).filter(
      (c) => c.missionId === missionId
    );
  }

  saveComparison(comp: VersionComparison): void {
    const all = readJson<VersionComparison[]>(COMPARISONS_KEY, []);
    const idx = all.findIndex((c) => c.id === comp.id);
    if (idx >= 0) all[idx] = comp;
    else all.push(comp);
    writeJson(COMPARISONS_KEY, all);
  }
}

const memoryStore: {
  outputs: CreationOutput[];
  changeRequests: ChangeRequest[];
  comparisons: VersionComparison[];
} = { outputs: [], changeRequests: [], comparisons: [] };

class MemoryOutputRepository implements OutputRepository {
  findById(outputId: string): CreationOutput | null {
    return memoryStore.outputs.find((o) => o.outputId === outputId) ?? null;
  }

  findByMission(missionId: string): CreationOutput[] {
    return memoryStore.outputs
      .filter((o) => o.missionId === missionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  findByMissionAndType(missionId: string, type: CreationOutput["type"]): CreationOutput[] {
    return this.findByMission(missionId).filter((o) => o.type === type);
  }

  save(output: CreationOutput): void {
    const idx = memoryStore.outputs.findIndex((o) => o.outputId === output.outputId);
    if (idx >= 0) memoryStore.outputs[idx] = output;
    else memoryStore.outputs.push(output);
  }

  saveAll(outputs: CreationOutput[]): void {
    for (const o of outputs) this.save(o);
  }

  delete(outputId: string): void {
    memoryStore.outputs = memoryStore.outputs.filter((o) => o.outputId !== outputId);
  }

  getChangeRequests(missionId: string): ChangeRequest[] {
    return memoryStore.changeRequests.filter((cr) => cr.missionId === missionId);
  }

  saveChangeRequest(cr: ChangeRequest): void {
    const idx = memoryStore.changeRequests.findIndex((c) => c.id === cr.id);
    if (idx >= 0) memoryStore.changeRequests[idx] = cr;
    else memoryStore.changeRequests.push(cr);
  }

  getComparisons(missionId: string): VersionComparison[] {
    return memoryStore.comparisons.filter((c) => c.missionId === missionId);
  }

  saveComparison(comp: VersionComparison): void {
    const idx = memoryStore.comparisons.findIndex((c) => c.id === comp.id);
    if (idx >= 0) memoryStore.comparisons[idx] = comp;
    else memoryStore.comparisons.push(comp);
  }
}

let _repo: OutputRepository | null = null;

export function getOutputRepository(): OutputRepository {
  if (!_repo) {
    _repo = isBrowser() ? new LocalStorageOutputRepository() : new MemoryOutputRepository();
  }
  return _repo;
}

export function seedMemoryOutputs(outputs: CreationOutput[]): void {
  memoryStore.outputs = [...outputs];
}

export { STORAGE_KEY };
