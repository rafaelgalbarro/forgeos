/** PROGRAM 5350 — Output builder (orchestrates adapters). */

import type { CreationOutput, CreationOutputType } from "./types";
import { registerOutputs } from "./output-registry";
import { applyValidation } from "./output-validator";

export interface BuildOutputsInput {
  missionId: string;
  ventureId?: string;
  ventureSlug?: string;
  ventureName: string;
  ideaText: string;
  types?: CreationOutputType[];
}

export async function buildAllOutputs(input: BuildOutputsInput): Promise<CreationOutput[]> {
  let types = input.types;
  if (!types) {
    try {
      const { getMultiOutputPlan, getCreationOutputTypesFromPlan } = await import("@/lib/multi-output/multi-output-plan");
      const plan = getMultiOutputPlan(input.missionId);
      types = plan ? getCreationOutputTypesFromPlan(plan) : undefined;
    } catch {
      types = undefined;
    }
  }
  types = types ?? [
    "VENTURE_OUTPUT",
    "WEBSITE_OUTPUT",
    "WEB_APPLICATION_OUTPUT",
    "MOBILE_APPLICATION_OUTPUT",
    "BACKEND_OUTPUT",
    "DEPLOYMENT_OUTPUT",
  ];

  const outputs: CreationOutput[] = [];

  for (const type of types) {
    const output = await buildSingleOutput(type, input);
    if (output) outputs.push(applyValidation(output));
  }

  if (outputs.length > 0) {
    const venture = outputs.find((o) => o.type === "VENTURE_OUTPUT");
    if (venture?.payload && "linkedOutputs" in venture.payload) {
      const linked: Record<string, string> = {};
      for (const o of outputs) {
        if (o.type !== "VENTURE_OUTPUT") linked[o.type] = o.outputId;
      }
      venture.payload = { ...venture.payload, linkedOutputs: linked };
    }
    registerOutputs(outputs);
  }

  return outputs;
}

async function buildSingleOutput(
  type: CreationOutputType,
  input: BuildOutputsInput
): Promise<CreationOutput | null> {
  const base = {
    missionId: input.missionId,
    ventureId: input.ventureId,
    ideaText: input.ideaText,
    projectName: input.ventureName,
  };

  switch (type) {
    case "VENTURE_OUTPUT": {
      if (!input.ventureSlug || !input.ventureId) return null;
      const { buildVentureOutput } = await import("./adapters/venture-output-adapter");
      return buildVentureOutput({
        missionId: input.missionId,
        ventureId: input.ventureId,
        ventureSlug: input.ventureSlug,
        ventureName: input.ventureName,
        ideaText: input.ideaText,
      });
    }
    case "WEBSITE_OUTPUT": {
      const { buildWebsiteOutput } = await import("./adapters/website-output-adapter");
      return buildWebsiteOutput(base);
    }
    case "WEB_APPLICATION_OUTPUT": {
      const { buildApplicationOutput } = await import("./adapters/application-output-adapter");
      return buildApplicationOutput(base);
    }
    case "MOBILE_APPLICATION_OUTPUT": {
      const { buildMobileOutput } = await import("./adapters/mobile-output-adapter");
      return buildMobileOutput(base);
    }
    case "BACKEND_OUTPUT": {
      const { buildBackendOutput } = await import("./adapters/backend-output-adapter");
      return buildBackendOutput(base);
    }
    case "DEPLOYMENT_OUTPUT": {
      const { buildDeploymentOutput } = await import("./adapters/deployment-output-adapter");
      return buildDeploymentOutput({
        missionId: input.missionId,
        ventureId: input.ventureId,
        projectName: input.ventureName,
      });
    }
    default:
      return null;
  }
}

export async function ensureMissionOutputs(
  missionId: string,
  ventureSlug?: string
): Promise<CreationOutput[]> {
  const { getOutputRepository } = await import("./output-repository");
  const existing = getOutputRepository().findByMission(missionId);
  if (existing.length >= 6) return existing;

  const { resolveVentureFixture } = await import("@/lib/venture-e2e/fixture-registry");
  const fixture = ventureSlug ? resolveVentureFixture(ventureSlug) : undefined;
  const venture = fixture?.venture;

  return buildAllOutputs({
    missionId,
    ventureId: venture?.id ?? `venture-${missionId}`,
    ventureSlug: ventureSlug ?? fixture?.slug,
    ventureName: venture?.name ?? "Demo Venture",
    ideaText: venture?.ideaText ?? "Plataforma demo generada por ForgeOS",
  });
}
