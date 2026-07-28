/** ForgeOS RC6.5 — organization memory (local persistence). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { BriefingDecision } from "./types";

interface OrganizationMemoryState {
  lastBriefingId: string | null;
  briefingDecision: BriefingDecision;
  acceptedPriorities: string[];
  delegationLog: { id: string; from: string; to: string; task: string; at: string }[];
  updatedAt: string;
}

const DEFAULT: OrganizationMemoryState = {
  lastBriefingId: null,
  briefingDecision: "pending",
  acceptedPriorities: [],
  delegationLog: [],
  updatedAt: new Date().toISOString(),
};

export function readOrganizationMemory(): OrganizationMemoryState {
  return readStorage<OrganizationMemoryState>(STORAGE_KEYS.autonomousOrganization, DEFAULT);
}

export function writeOrganizationMemory(patch: Partial<OrganizationMemoryState>): OrganizationMemoryState {
  const next = { ...readOrganizationMemory(), ...patch, updatedAt: new Date().toISOString() };
  writeStorage(STORAGE_KEYS.autonomousOrganization, next);
  return next;
}

export function recordBriefingDecision(
  briefingId: string,
  decision: BriefingDecision,
  priorityIds?: string[]
): OrganizationMemoryState {
  return writeOrganizationMemory({
    lastBriefingId: briefingId,
    briefingDecision: decision,
    acceptedPriorities: priorityIds ?? readOrganizationMemory().acceptedPriorities,
  });
}

export function recordDelegation(from: string, to: string, task: string): void {
  const mem = readOrganizationMemory();
  writeOrganizationMemory({
    delegationLog: [
      { id: crypto.randomUUID(), from, to, task, at: new Date().toISOString() },
      ...mem.delegationLog,
    ].slice(0, 100),
  });
}
