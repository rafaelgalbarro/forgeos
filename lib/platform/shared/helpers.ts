/** ForgeOS Platform — small shared utilities. */

import type { PillarStatus } from "./types";

export function nowIso(): string {
  return new Date().toISOString();
}

export function isScaffold(status: PillarStatus): boolean {
  return status === "scaffold";
}

export function emptyArray<T>(): T[] {
  return [];
}

export function stubAsync<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}
