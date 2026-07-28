/** PROGRAM 5370 — Sandbox lifecycle state machine. */

import type { PreviewSandboxStatus } from "./types";

const VALID_TRANSITIONS: Record<PreviewSandboxStatus, PreviewSandboxStatus[]> = {
  PENDING: ["PREPARING", "FAILED", "STOPPED"],
  PREPARING: ["INSTALLING", "FAILED", "STOPPING"],
  INSTALLING: ["BUILDING", "FAILED", "STOPPING"],
  BUILDING: ["STARTING", "FAILED", "DEGRADED", "STOPPING"],
  STARTING: ["READY", "DEGRADED", "FAILED", "STOPPING"],
  READY: ["STOPPING", "DEGRADED", "EXPIRED", "FAILED"],
  DEGRADED: ["STOPPING", "READY", "FAILED", "EXPIRED"],
  FAILED: ["STOPPING", "PENDING", "STOPPED"],
  STOPPING: ["STOPPED", "FAILED"],
  STOPPED: ["PENDING", "EXPIRED"],
  EXPIRED: ["PENDING"],
};

export function canTransition(from: PreviewSandboxStatus, to: PreviewSandboxStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: PreviewSandboxStatus, to: PreviewSandboxStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid sandbox transition: ${from} → ${to}`);
  }
}

export const TERMINAL_STATUSES: PreviewSandboxStatus[] = ["STOPPED", "EXPIRED", "FAILED"];

export function isTerminal(status: PreviewSandboxStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isActive(status: PreviewSandboxStatus): boolean {
  return !isTerminal(status) && status !== "STOPPING";
}

export const SANDBOX_TTL_MS = 30 * 60 * 1000;

export function computeExpiresAt(from = Date.now()): string {
  return new Date(from + SANDBOX_TTL_MS).toISOString();
}

export function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}
