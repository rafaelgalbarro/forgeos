/** ForgeOS RC11 — Enterprise state persistence (localStorage demo). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { EnterpriseState } from "./types";

const EMPTY_STATE: EnterpriseState = {
  organizations: [],
  users: [],
  teams: [],
  apiKeys: [],
  webhooks: [],
};

export function readEnterpriseState(): EnterpriseState {
  return readStorage<EnterpriseState>(STORAGE_KEYS.enterpriseState, EMPTY_STATE);
}

export function writeEnterpriseState(state: EnterpriseState): void {
  writeStorage(STORAGE_KEYS.enterpriseState, state);
}

export function updateEnterpriseState(
  updater: (state: EnterpriseState) => EnterpriseState
): EnterpriseState {
  const next = updater(readEnterpriseState());
  writeEnterpriseState(next);
  return next;
}

export function resetEnterpriseState(): void {
  writeEnterpriseState(EMPTY_STATE);
}

export function getActiveOrgId(): string | undefined {
  return readEnterpriseState().activeOrgId;
}

export function setActiveOrgId(orgId: string): void {
  updateEnterpriseState((s) => ({ ...s, activeOrgId: orgId }));
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export { uid };
