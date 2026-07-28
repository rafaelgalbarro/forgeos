/**
 * ForgeOS 2030.1 — operational in-memory epic registry.
 * Separate from program descriptor epic scaffold in lib/programs/.
 */

import { PROGRAM_IDS } from "@/lib/programs/constants";
import type { ProgramId } from "@/lib/programs/types";
import type { EpicRecord } from "./types";

const epics = new Map<string, EpicRecord>();

function isValidProgramId(programId: string): programId is ProgramId {
  return (PROGRAM_IDS as readonly string[]).includes(programId);
}

export function registerEpic(epic: EpicRecord): void {
  if (!isValidProgramId(epic.programId)) {
    throw new Error(
      `Invalid programId "${epic.programId}". Must be one of: ${PROGRAM_IDS.join(", ")}`,
    );
  }
  epics.set(epic.id, epic);
}

export function getEpic(epicId: string): EpicRecord | undefined {
  return epics.get(epicId);
}

export function listEpics(): EpicRecord[] {
  return Array.from(epics.values());
}

export function listEpicsByProgram(programId: ProgramId): EpicRecord[] {
  return listEpics().filter((epic) => epic.programId === programId);
}

export function assignEpicToProgram(epicId: string, programId: ProgramId): EpicRecord {
  if (!isValidProgramId(programId)) {
    throw new Error(
      `Invalid programId "${programId}". Must be one of: ${PROGRAM_IDS.join(", ")}`,
    );
  }

  const epic = epics.get(epicId);
  if (!epic) {
    throw new Error(`Epic not found: ${epicId}`);
  }

  const updated: EpicRecord = {
    ...epic,
    programId,
    updatedAt: new Date().toISOString(),
  };
  epics.set(epicId, updated);
  return updated;
}

export function clearEpicRegistry(): void {
  epics.clear();
}
