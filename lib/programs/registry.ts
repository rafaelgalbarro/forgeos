/** ForgeOS Master Program 2030 — central program registry. */

import type { ProgramDescriptor, ProgramId } from "./types";

const programs = new Map<ProgramId, ProgramDescriptor>();

export function registerProgram(program: ProgramDescriptor): void {
  programs.set(program.id, program);
}

export function getProgram(id: ProgramId): ProgramDescriptor | undefined {
  return programs.get(id);
}

export function listPrograms(): ProgramDescriptor[] {
  return Array.from(programs.values());
}

export function clearProgramRegistry(): void {
  programs.clear();
}
