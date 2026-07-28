/** PROGRAM 5360 — Script builder. */

import type { CodeScript } from "./types";
import type { TemplateManifest } from "./templates/types";

export function buildScriptsFromTemplate(manifest: TemplateManifest): CodeScript[] {
  return Object.entries(manifest.scripts).map(([name, command]) => ({
    name,
    command,
    purpose: `Script: ${name}`,
  }));
}

export function scriptsToRecord(scripts: CodeScript[]): Record<string, string> {
  return Object.fromEntries(scripts.map((s) => [s.name, s.command]));
}
