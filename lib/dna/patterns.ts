import type { ForgePattern } from "./types";

export const DNA_PATTERNS: ForgePattern[] = [];

export function findPatternsByTag(tag: string): ForgePattern[] {
  return DNA_PATTERNS.filter((p) => p.tags.includes(tag));
}
