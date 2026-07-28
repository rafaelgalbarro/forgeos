/** PROGRAM 5360 — E2E NEXORA FIELD code generation pipeline. */

import {
  NEXORA_FIELD_ALIAS,
  NEXORA_FIELD_IDEA,
  NEXORA_FIELD_VENTURE_ID,
} from "@/lib/fixtures/nexora-field-venture";
import { NEXORA_E2E_MISSION_ID } from "@/lib/creation-output/e2e-nexora-pipeline";
import { generateAllProjectsForMission } from "./code-generation-engine";
import { getCodeRepository, seedCodeProjects } from "./code-repository";
import { exportProjectAsZipBuffer, isValidZipBuffer } from "./export/code-zip-exporter";
import { buildExportManifest } from "./export/code-manifest-exporter";
import type { CodeGenerationResult, CodeProject } from "./types";
import { extractModulesFromIdea } from "./generators/shared";

export const CODE_E2E_MISSION_ID = NEXORA_E2E_MISSION_ID;

export interface NexoraCodeE2EResult {
  missionId: string;
  ventureSlug: string;
  projects: CodeProject[];
  results: CodeGenerationResult[];
  fileCounts: Record<string, number>;
  validations: Record<string, string>;
  exports: { projectId: string; zipValid: boolean; manifestFileCount: number }[];
  totalDurationMs: number;
  generationMode: string;
  allPassed: boolean;
  genericFixturePassed: boolean;
  disclaimer: string;
}

export async function runNexoraFieldCodeE2EPipeline(): Promise<NexoraCodeE2EResult> {
  const start = Date.now();
  const modules = extractModulesFromIdea(NEXORA_FIELD_IDEA);

  const results = await generateAllProjectsForMission(CODE_E2E_MISSION_ID, {
    ventureName: "NEXORA FIELD",
    ideaText: NEXORA_FIELD_IDEA,
    ventureId: NEXORA_FIELD_VENTURE_ID,
    ventureSlug: NEXORA_FIELD_ALIAS,
    modules,
  });

  const projects = results.map((r) => r.project);
  seedCodeProjects(projects);

  const fileCounts: Record<string, number> = {};
  const validations: Record<string, string> = {};
  const exports: NexoraCodeE2EResult["exports"] = [];

  for (const p of projects) {
    fileCounts[p.projectType] = p.files.length;
    validations[p.projectType] = p.validation?.result ?? "STATIC_VALIDATION_FAILED";

    const zipBuffer = await exportProjectAsZipBuffer(p);
    const manifest = buildExportManifest(p);
    exports.push({
      projectId: p.projectId,
      zipValid: isValidZipBuffer(zipBuffer),
      manifestFileCount: manifest.fileCount,
    });
  }

  const genericResult = await runGenericFixtureValidation();
  const allPassed =
    projects.every((p) => p.validation?.result === "STATIC_VALIDATION_PASSED") &&
    exports.every((e) => e.zipValid) &&
    genericResult.passed;

  return {
    missionId: CODE_E2E_MISSION_ID,
    ventureSlug: NEXORA_FIELD_ALIAS,
    projects,
    results,
    fileCounts,
    validations,
    exports,
    totalDurationMs: Date.now() - start,
    generationMode: results[0]?.mode ?? "template",
    allPassed,
    genericFixturePassed: genericResult.passed,
    disclaimer:
      "NEXORA FIELD es validación E2E genérica. Proyectos autónomos, sin ejecución ni deploy real.",
  };
}

export async function runGenericFixtureValidation(): Promise<{ passed: boolean; fileCount: number }> {
  const { generateWebsiteProject } = await import("./generators/website-generator");
  const project = await generateWebsiteProject({
    missionId: "generic-fixture-5360",
    ventureName: "Generic SaaS Demo",
    ideaText: "A generic project management tool for teams.",
    projectType: "website",
  });
  return {
    passed: project.validation?.result === "STATIC_VALIDATION_PASSED" && project.files.length >= 10,
    fileCount: project.files.length,
  };
}

export function getCodeStudioHref(missionId: string): string {
  return `/studio/${missionId}/code`;
}

export async function loadCodeProjectsForMission(missionId: string, ventureSlug?: string) {
  const repo = getCodeRepository();
  let projects = repo.getByMission(missionId);

  if (projects.length === 0) {
    if (missionId === CODE_E2E_MISSION_ID || ventureSlug === NEXORA_FIELD_ALIAS) {
      const result = await runNexoraFieldCodeE2EPipeline();
      projects = result.projects;
    } else {
      const { loadEngineContext, generateAllProjectsForMission: genAll } = await import(
        "./code-generation-engine"
      );
      const ctx = await loadEngineContext(missionId, ventureSlug);
      const results = await genAll(missionId, ctx);
      projects = results.map((r) => r.project);
    }
  }

  return projects;
}
