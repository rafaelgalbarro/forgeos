/** PROGRAM 5360 — Environment variable builder. */

import type { CodeEnvironmentVariable } from "./types";
import type { TemplateManifest } from "./templates/types";

export function buildEnvVarsFromTemplate(manifest: TemplateManifest): CodeEnvironmentVariable[] {
  return manifest.envVars.map((v) => ({
    key: v.key,
    description: v.description,
    example: v.example,
    required: v.required,
    secret: v.secret,
  }));
}

export function buildEnvExampleContent(vars: CodeEnvironmentVariable[]): string {
  const lines = vars.map((v) => {
    const comment = `# ${v.description}${v.required ? " (required)" : ""}`;
    return `${comment}\n${v.key}=${v.example}`;
  });
  return lines.join("\n\n") + "\n";
}
