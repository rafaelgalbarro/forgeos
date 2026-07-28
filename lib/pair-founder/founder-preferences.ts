/** Per-mission founder preference adaptation (mission-scoped, not duplicated). */

import type { FounderPreference } from "./types";

const STORAGE_PREFIX = "forgeos-pair-founder-prefs-";

const DEFAULT_PREFS: FounderPreference = {
  tone: "collaborative",
  riskTolerance: "balanced",
  decisionStyle: "one-at-a-time",
  autoPilotBias: "quality",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readFounderPreferences(missionId: string): FounderPreference {
  if (!isBrowser()) return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${missionId}`);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<FounderPreference>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeFounderPreferences(missionId: string, prefs: Partial<FounderPreference>): FounderPreference {
  const merged = { ...readFounderPreferences(missionId), ...prefs };
  if (isBrowser()) {
    localStorage.setItem(`${STORAGE_PREFIX}${missionId}`, JSON.stringify(merged));
  }
  return merged;
}

export function adaptPreferencesFromInput(missionId: string, input: string): FounderPreference {
  const prefs = readFounderPreferences(missionId);
  const lower = input.toLowerCase();
  const updates: Partial<FounderPreference> = {};

  if (/rápido|veloz|ya|urgente|pronto/.test(lower)) updates.autoPilotBias = "speed";
  if (/calidad|detalle|revisar|cuidado/.test(lower)) updates.autoPilotBias = "quality";
  if (/conservador|seguro|prudente/.test(lower)) updates.riskTolerance = "conservative";
  if (/arriesgar|agresivo|ambicioso/.test(lower)) updates.riskTolerance = "aggressive";
  if (/directo|breve|sin rodeos/.test(lower)) updates.tone = "direct";

  if (Object.keys(updates).length) return writeFounderPreferences(missionId, updates);
  return prefs;
}

export function preferenceToneHint(prefs: FounderPreference): string {
  const tones: Record<FounderPreference["tone"], string> = {
    direct: "Sé directo y conciso.",
    collaborative: "Colabora y valida antes de avanzar.",
    analytical: "Justifica con datos y trade-offs.",
  };
  return tones[prefs.tone];
}
