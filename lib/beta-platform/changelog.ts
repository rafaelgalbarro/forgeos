import type { BetaChangelogEntry } from "./types";
import { CHANGELOG as LAUNCH_CHANGELOG } from "@/lib/launch/changelog";

export const BETA_CHANGELOG: BetaChangelogEntry[] = [
  {
    version: "1.0.0-sprint6",
    date: "2026-07-07",
    title: "Private Beta Platform",
    tag: "major",
    sprint: "Sprint 6",
    highlights: [
      "Waitlist con posición en cola",
      "Códigos de invitación y canje",
      "Beta dashboard con feature flags",
      "Analytics local y crash reports stub",
      "Centro de feedback y soporte mejorado",
    ],
  },
  ...LAUNCH_CHANGELOG.map((entry) => ({
    ...entry,
    sprint: entry.version.includes("rc12") ? "RC12" : undefined,
  })),
];

export function getLatestBetaChangelog(): BetaChangelogEntry {
  return BETA_CHANGELOG[0];
}

export function getRecentChangelog(limit = 5): BetaChangelogEntry[] {
  return BETA_CHANGELOG.slice(0, limit);
}
