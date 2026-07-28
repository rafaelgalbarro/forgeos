/** PROGRAM 5360 — Code generation engine (orchestrator). */

import type { CodeGenerationInput, CodeGenerationResult, CodeProject, CodeProjectType } from "./types";
import { getCodeRepository, seedCodeProjects } from "./code-repository";
import { applyValidationToProject } from "./code-validator";
import { isAiGenerationAvailable } from "./ai-adapter";
import { selectTemplateId } from "./templates/loader";

export interface CodeEngineContext {
  ventureName: string;
  ideaText: string;
  ventureId?: string;
  ventureSlug?: string;
  modules?: string[];
}

/** Build context from Build Context + Build DNA adapters. */
export async function loadEngineContext(
  missionId: string,
  ventureSlug?: string
): Promise<CodeEngineContext & { buildContextLoaded: boolean; buildDnaLoaded: boolean }> {
  let ventureName = "Generated Project";
  let ideaText = "A modern software product";
  let ventureId: string | undefined;
  let modules: string[] | undefined;
  let buildContextLoaded = false;
  let buildDnaLoaded = false;

  try {
    const { getBuildContext } = await import("@/lib/build-platform/build-context/context-store");
    if (ventureSlug) {
      const ctx = getBuildContext(ventureSlug);
      if (ctx) {
        buildContextLoaded = true;
        ventureName = ctx.meta.ventureName || ventureName;
        ventureId = ctx.meta.ventureId;
        const product = ctx.sections.productPrd?.data as { summary?: string } | null;
        if (product?.summary) ideaText = product.summary;
      }
    }
  } catch {
    /* Build Context optional */
  }

  try {
    const { buildDnaFromDefaults } = await import("@/lib/build-platform/build-dna/dna-builder");
    if (ventureId) {
      buildDnaFromDefaults(ventureId, ventureName);
      buildDnaLoaded = true;
    }
  } catch {
    /* Build DNA optional */
  }

  return { ventureName, ideaText, ventureId, ventureSlug, modules, buildContextLoaded, buildDnaLoaded };
}

export async function generateCodeProject(input: CodeGenerationInput): Promise<CodeGenerationResult> {
  const start = Date.now();
  const mode = isAiGenerationAvailable() ? "ai" : "template";

  let project: CodeProject;

  switch (input.projectType) {
    case "website": {
      const { generateWebsiteProject } = await import("./generators/website-generator");
      project = await generateWebsiteProject(input);
      break;
    }
    case "web_application": {
      const { generateWebApplicationProject } = await import("./generators/web-application-generator");
      project = await generateWebApplicationProject(input);
      break;
    }
    case "mobile": {
      const { generateMobileProject } = await import("./generators/mobile-generator");
      project = await generateMobileProject(input);
      break;
    }
    case "backend": {
      const { generateBackendProject } = await import("./generators/backend-generator");
      project = await generateBackendProject(input);
      break;
    }
    default:
      throw new Error(`Unsupported project type: ${input.projectType}`);
  }

  project = {
    ...project,
    templateId: project.templateId || selectTemplateId(input.projectType),
    generationMode: mode === "ai" && project.generationMode === "template" ? "template" : mode,
    status: "VALIDATING",
  };

  project = applyValidationToProject(project);
  project = {
    ...project,
    generationDurationMs: Date.now() - start,
    generatedAt: new Date().toISOString(),
  };

  getCodeRepository().save(project);

  return {
    project,
    mode: project.generationMode,
    durationMs: project.generationDurationMs ?? 0,
    warnings: project.warnings,
  };
}

export async function generateAllProjectsForMission(
  missionId: string,
  ctx: CodeEngineContext & { outputIds?: Partial<Record<CodeProjectType, string>> }
): Promise<CodeGenerationResult[]> {
  const types: CodeProjectType[] = ["website", "web_application", "mobile", "backend"];
  const results: CodeGenerationResult[] = [];

  for (const projectType of types) {
    const result = await generateCodeProject({
      missionId,
      ventureId: ctx.ventureId,
      ventureName: ctx.ventureName,
      ventureSlug: ctx.ventureSlug,
      ideaText: ctx.ideaText,
      projectType,
      outputId: ctx.outputIds?.[projectType],
      modules: ctx.modules,
    });
    results.push(result);
  }

  seedCodeProjects(results.map((r) => r.project));
  return results;
}

export function mapOutputTypeToProjectType(outputType: string): CodeProjectType | null {
  const map: Record<string, CodeProjectType> = {
    WEBSITE_OUTPUT: "website",
    WEB_APPLICATION_OUTPUT: "web_application",
    MOBILE_APPLICATION_OUTPUT: "mobile",
    BACKEND_OUTPUT: "backend",
  };
  return map[outputType] ?? null;
}

export async function generateFromCreationOutput(
  missionId: string,
  outputType: string,
  ctx: CodeEngineContext
): Promise<CodeGenerationResult | null> {
  const projectType = mapOutputTypeToProjectType(outputType);
  if (!projectType) return null;
  return generateCodeProject({
    missionId,
    ventureId: ctx.ventureId,
    ventureName: ctx.ventureName,
    ventureSlug: ctx.ventureSlug,
    ideaText: ctx.ideaText,
    projectType,
    modules: ctx.modules,
  });
}
