import type { BetaSignupRecord } from "./types";

const STORAGE_KEY = "forgeos-beta-signup";

let memoryRecord: BetaSignupRecord | null = null;

function read(): BetaSignupRecord | null {
  if (typeof window === "undefined") return memoryRecord;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memoryRecord = JSON.parse(raw) as BetaSignupRecord;
  } catch {
    /* keep memory */
  }
  return memoryRecord;
}

function write(record: BetaSignupRecord): void {
  memoryRecord = record;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  }
}

export function getBetaSignup(): BetaSignupRecord | null {
  return read();
}

export function hasBetaAccess(): boolean {
  const record = read();
  return record?.status === "approved" || record?.status === "active";
}

export function submitBetaSignup(input: {
  email: string;
  name: string;
  company?: string;
  useCase?: string;
}): BetaSignupRecord {
  const record: BetaSignupRecord = {
    id: `beta-${Date.now()}`,
    email: input.email.trim(),
    name: input.name.trim(),
    company: input.company?.trim(),
    useCase: input.useCase?.trim(),
    status: "approved",
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  };
  write(record);
  return record;
}

export function activateBetaSignup(): BetaSignupRecord | null {
  const existing = read();
  if (!existing) return null;
  const updated: BetaSignupRecord = { ...existing, status: "active" };
  write(updated);
  return updated;
}

export function clearBetaSignup(): void {
  memoryRecord = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
