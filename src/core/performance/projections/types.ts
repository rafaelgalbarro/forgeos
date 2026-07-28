/**
 * PROGRAM 6100 — Projection base types.
 */

export type ProjectionFreshness = "LIVE" | "STALE" | "REBUILDING";

export interface ProjectionMeta {
  version: number;
  updatedAt: string;
  freshness: ProjectionFreshness;
  sourceEvents: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  cursor?: string;
  hasMore: boolean;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  offset?: number;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}
