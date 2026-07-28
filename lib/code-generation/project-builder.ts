/** PROGRAM 5360 — Project builder (assembles CodeProject from parts). */

import { buildLegacyManifest } from "./legacy-adapter";
import { createEmptyCodeProject, extractDirectories } from "./code-project";
import { buildDependenciesFromTemplate } from "./dependency-builder";
import { buildScriptsFromTemplate } from "./script-builder";
import { buildEnvVarsFromTemplate, buildEnvExampleContent } from "./environment-builder";
import type { TemplateManifest } from "./templates/types";
import type { CodeFile, CodeProject } from "./types";

export interface ProjectBuildInput {
  missionId: string;
  ventureId?: string;
  outputId?: string;
  name: string;
  projectType: CodeProject["projectType"];
  template: TemplateManifest;
  files: CodeFile[];
  routes?: CodeProject["routes"];
  database?: CodeProject["database"];
  api?: CodeProject["api"];
  tests?: CodeProject["tests"];
  warnings?: CodeProject["warnings"];
  generationMode?: CodeProject["generationMode"];
}

export function buildProject(input: ProjectBuildInput): CodeProject {
  const now = new Date().toISOString();
  const project = createEmptyCodeProject({
    missionId: input.missionId,
    ventureId: input.ventureId,
    outputId: input.outputId,
    projectType: input.projectType,
    name: input.name,
    templateId: input.template.id,
    framework: input.template.stack.framework,
    language: input.template.stack.language,
  });

  const envVars = buildEnvVarsFromTemplate(input.template);
  const readme = input.files.find((f) => f.path === "README.md")?.content ?? "";
  const envExample =
    input.files.find((f) => f.path === ".env.example")?.content ?? buildEnvExampleContent(envVars);

  const built: CodeProject = {
    ...project,
    files: input.files,
    directories: extractDirectories(input.files),
    dependencies: buildDependenciesFromTemplate(input.template),
    scripts: buildScriptsFromTemplate(input.template),
    environmentVariables: envVars,
    routes: input.routes ?? [],
    database: input.database,
    api: input.api,
    tests: input.tests,
    documentation: { readme, envExample },
    warnings: input.warnings ?? [],
    status: "GENERATED",
    generationMode: input.generationMode ?? "template",
    generatedAt: now,
    updatedAt: now,
  };
  return { ...built, manifest: buildLegacyManifest(built) };
}
