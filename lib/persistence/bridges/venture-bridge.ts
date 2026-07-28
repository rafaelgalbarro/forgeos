/** Venture bridge — wires lib/store/ventures to venture repository. */

import type { VentureProject } from "@/lib/domain/venture";
import { getVentureRepository } from "../index";
import { scheduleAutosave } from "../autosave/autosave";
import { recordVersion } from "../versioning/versioning";

const ventureRepo = () => getVentureRepository();

function readLocal(): VentureProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("forgeos-ventures");
    return raw ? (JSON.parse(raw) as VentureProject[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(ventures: VentureProject[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("forgeos-ventures", JSON.stringify(ventures));
  }
}

/** Sync API — drop-in replacement for lib/store/ventures.ts exports. */
export function getVentures(): VentureProject[] {
  return readLocal();
}

export function saveVenture(venture: VentureProject): VentureProject {
  const ventures = readLocal();
  const i = ventures.findIndex((v) => v.id === venture.id);
  const updated = { ...venture, updatedAt: new Date().toISOString() };
  if (i >= 0) ventures[i] = updated;
  else ventures.unshift(updated);
  writeLocal(ventures);

  void ventureRepo().save(updated);
  scheduleAutosave(`venture:${venture.id}`, async () => {
    await ventureRepo().save(updated);
  });
  void recordVersion("venture", venture.id, updated);

  return updated;
}

export function getVentureById(id: string): VentureProject | undefined {
  return readLocal().find((v) => v.id === id);
}

export function deleteVenture(id: string): void {
  writeLocal(readLocal().filter((v) => v.id !== id));
  void ventureRepo().delete(id);
}

/** Async API */
export async function asyncGetVentures(): Promise<VentureProject[]> {
  return ventureRepo().findAll();
}

export async function asyncSaveVenture(
  venture: VentureProject
): Promise<VentureProject> {
  return ventureRepo().save(venture);
}

export async function asyncGetVentureById(
  id: string
): Promise<VentureProject | null> {
  return ventureRepo().findById(id);
}

export async function asyncGetVenturesByWorkspace(
  workspaceId: string,
  ventureIds: string[]
): Promise<VentureProject[]> {
  return ventureRepo().findByWorkspace(workspaceId, ventureIds);
}
