/** PROGRAM 5360 — Dependency builder. */

import type { CodeDependency } from "./types";
import type { TemplateManifest } from "./templates/types";

export function buildDependenciesFromTemplate(manifest: TemplateManifest): CodeDependency[] {
  const deps: CodeDependency[] = Object.entries(manifest.dependencies).map(([name, version]) => ({
    name,
    version,
    dev: false,
  }));
  if (manifest.devDependencies) {
    for (const [name, version] of Object.entries(manifest.devDependencies)) {
      deps.push({ name, version, dev: true });
    }
  }
  return deps;
}

export function dependenciesToPackageJson(deps: CodeDependency[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const d of deps.filter((d) => !d.dev)) result[d.name] = d.version;
  return result;
}

export function devDependenciesToPackageJson(deps: CodeDependency[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const d of deps.filter((d) => d.dev)) result[d.name] = d.version;
  return result;
}
