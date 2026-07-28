/** PROGRAM 5370 — Normalize errors for UI and repair plans. */

import type { PreviewParsedError } from "./types";
import { parseErrorOutput } from "./error-parser";

export function normalizeErrors(stdout: string, stderr: string): PreviewParsedError[] {
  const parsed = parseErrorOutput(stdout, stderr);
  return parsed.map((e) => ({
    ...e,
    message: e.message.replace(/\x1b\[[0-9;]*m/g, "").slice(0, 500),
    file: e.file?.replace(/\\/g, "/"),
  }));
}

export function groupErrorsByCategory(errors: PreviewParsedError[]): Record<string, PreviewParsedError[]> {
  const groups: Record<string, PreviewParsedError[]> = {};
  for (const err of errors) {
    if (!groups[err.category]) groups[err.category] = [];
    groups[err.category].push(err);
  }
  return groups;
}

export function primaryError(errors: PreviewParsedError[]): PreviewParsedError | null {
  return errors[0] ?? null;
}
