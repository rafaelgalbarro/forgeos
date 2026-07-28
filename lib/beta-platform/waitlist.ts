import type { WaitlistEntry } from "./types";
import { readStorage, writeStorage } from "./storage";

const STORAGE_KEY = "forgeos-beta-waitlist";
const QUEUE_COUNTER_KEY = "forgeos-beta-queue-counter";

let memoryEntry: WaitlistEntry | null = null;
let memoryQueueCounter = 100;

function readCounter(): number {
  if (typeof window === "undefined") return memoryQueueCounter;
  const stored = readStorage<number>(QUEUE_COUNTER_KEY, 100);
  memoryQueueCounter = stored;
  return stored;
}

function bumpCounter(): number {
  const next = readCounter() + 1;
  memoryQueueCounter = next;
  writeStorage(QUEUE_COUNTER_KEY, next);
  return next;
}

function read(): WaitlistEntry | null {
  if (typeof window === "undefined") return memoryEntry;
  const stored = readStorage<WaitlistEntry | null>(STORAGE_KEY, null);
  if (stored) memoryEntry = stored;
  return memoryEntry;
}

function write(entry: WaitlistEntry): void {
  memoryEntry = entry;
  writeStorage(STORAGE_KEY, entry);
}

export function getWaitlistEntry(): WaitlistEntry | null {
  return read();
}

export function isOnWaitlist(): boolean {
  return read() !== null;
}

export function joinWaitlist(input: {
  email: string;
  name: string;
  company?: string;
  useCase?: string;
}): WaitlistEntry {
  const existing = read();
  if (existing) return existing;

  const position = bumpCounter();
  const entry: WaitlistEntry = {
    id: `wl-${Date.now()}`,
    email: input.email.trim(),
    name: input.name.trim(),
    company: input.company?.trim(),
    useCase: input.useCase?.trim(),
    status: "pending",
    queuePosition: position,
    createdAt: new Date().toISOString(),
  };
  write(entry);
  return entry;
}

export function getQueuePosition(): number | null {
  const entry = read();
  return entry?.queuePosition ?? null;
}

export function markWaitlistInvited(): WaitlistEntry | null {
  const entry = read();
  if (!entry) return null;
  const updated: WaitlistEntry = {
    ...entry,
    status: "invited",
    invitedAt: new Date().toISOString(),
  };
  write(updated);
  return updated;
}

export function markWaitlistRegistered(): WaitlistEntry | null {
  const entry = read();
  if (!entry) return null;
  const updated: WaitlistEntry = {
    ...entry,
    status: "registered",
    registeredAt: new Date().toISOString(),
  };
  write(updated);
  return updated;
}

export function activateWaitlist(): WaitlistEntry | null {
  const entry = read();
  if (!entry) return null;
  const updated: WaitlistEntry = { ...entry, status: "active" };
  write(updated);
  return updated;
}

export function clearWaitlist(): void {
  memoryEntry = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Estimated wait based on queue position (demo heuristic) */
export function estimateWaitDays(position: number): number {
  return Math.max(1, Math.ceil(position / 50));
}
