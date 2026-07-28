/** PROGRAM 5360 — Legacy manifest adapter for preview-runtime (5370). */

import type { CodeProject, CodeProjectKind } from "./types";

export interface CodeProjectLegacyManifest {
  projectId: string;
  missionId: string;
  outputId?: string;
  kind: CodeProjectKind;
  framework: string;
  name: string;
  version: string;
  scripts: {
    install?: string;
    build?: string;
    dev?: string;
    start?: string;
    test?: string;
  };
  envVars: { key: string; value: string; source: "manifest" | "sandbox-default"; sensitive?: boolean }[];
  routes: { path: string; label: string }[];
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  declaredTests?: string[];
  generatedAt: string;
}

export function projectTypeToKind(type: CodeProject["projectType"]): CodeProjectKind {
  const map: Record<CodeProject["projectType"], CodeProjectKind> = {
    website: "website",
    web_application: "webapp",
    mobile: "mobile",
    backend: "backend",
    fullstack: "webapp",
  };
  return map[type];
}

export function buildLegacyManifest(project: CodeProject): CodeProjectLegacyManifest {
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};
  for (const d of project.dependencies) {
    if (d.dev) devDeps[d.name] = d.version;
    else deps[d.name] = d.version;
  }

  const scripts: CodeProjectLegacyManifest["scripts"] = {};
  for (const s of project.scripts) {
    if (s.name === "dev") scripts.dev = s.command;
    else if (s.name === "build") scripts.build = s.command;
    else if (s.name === "start") scripts.start = s.command;
    else if (s.name === "test") scripts.test = s.command;
  }
  scripts.install = "npm install";

  return {
    projectId: project.projectId,
    missionId: project.missionId,
    outputId: project.outputId,
    kind: projectTypeToKind(project.projectType),
    framework: project.framework,
    name: project.name,
    version: project.version,
    scripts,
    envVars: project.environmentVariables.map((v) => ({
      key: v.key,
      value: v.example,
      source: "manifest" as const,
      sensitive: v.secret,
    })),
    routes: project.routes.map((r) => ({ path: r.path, label: r.label })),
    dependencies: deps,
    devDependencies: Object.keys(devDeps).length > 0 ? devDeps : undefined,
    declaredTests: project.tests?.files,
    generatedAt: project.generatedAt ?? project.updatedAt,
  };
}

export function withLegacyManifest(project: CodeProject): CodeProject & { manifest: CodeProjectLegacyManifest } {
  return { ...project, manifest: buildLegacyManifest(project) };
}
