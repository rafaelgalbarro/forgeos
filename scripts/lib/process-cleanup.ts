/**
 * @see ./process-cleanup.js
 */
export type CleanupResult = {
  killed: number;
  skippedForeign: Array<{ port: number; pid: number; reason: string }>;
  stuckRequired: number[];
  reclaimed?: Array<{ pid: number; port: number }>;
  ok: boolean;
};
