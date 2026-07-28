/** PROGRAM 5360 — Load CodeProject from Creation Output / generators. */

import type { CreationOutput, CreationOutputType } from "@/lib/creation-output/types";
import type { CodeProject, CodeProjectKind, CodeProjectLoadRequest, CodeProjectType } from "./types";
import { kindToProjectType } from "./types";
import { generateCodeProject, mapOutputTypeToProjectType } from "./code-generation-engine";
import { getCodeRepository } from "./code-repository";

export { outputTypeToKind } from "./kind-map";

export async function loadCodeProjectFromOutput(
  output: CreationOutput,
  ventureName: string,
  ideaText: string
): Promise<CodeProject | null> {
  const projectType = mapOutputTypeToProjectType(output.type);
  if (!projectType) return null;

  const existing = getCodeRepository().getLatestByMissionAndType(output.missionId, projectType);
  if (existing) return existing;

  const result = await generateCodeProject({
    missionId: output.missionId,
    ventureId: output.ventureId,
    ventureName,
    ideaText,
    outputId: output.outputId,
    projectType,
  });
  return result.project;
}

export async function loadCodeProject(request: CodeProjectLoadRequest): Promise<CodeProject | null> {
  const { missionId, outputId, kind } = request;
  const ventureSlug = missionId.includes("nexora") ? "nexora-field" : undefined;

  if (outputId || !kind) {
    const { ensureMissionOutputs } = await import("@/lib/creation-output/output-builder");
    const { seedMemoryOutputs } = await import("@/lib/creation-output/output-repository");
    const outputs = await ensureMissionOutputs(missionId, ventureSlug);
    seedMemoryOutputs(outputs);
  }

  if (outputId) {
    const { getOutputRepository } = await import("@/lib/creation-output/output-repository");
    const output = getOutputRepository().findById(outputId);
    if (output) {
      return loadCodeProjectFromOutput(output, output.title, output.title);
    }
  }

  const projectType = kind ? kindToProjectType(kind) : ("website" as CodeProjectType);
  if (!projectType) return null;

  const result = await generateCodeProject({
    missionId,
    ventureName: `Preview ${kind ?? "website"}`,
    ideaText: "Generated preview project",
    projectType,
  });
  return result.project;
}

export async function loadNexoraCodeProjects(missionId: string): Promise<CodeProject[]> {
  const { loadCodeProjectsForMission } = await import("./e2e-nexora-pipeline");
  return loadCodeProjectsForMission(missionId, "nexora-field");
}
