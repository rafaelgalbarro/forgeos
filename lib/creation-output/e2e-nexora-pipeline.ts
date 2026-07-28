/** PROGRAM 5350 — E2E NEXORA FIELD validation pipeline (generic, no hardcoded motor). */

import {
  NEXORA_FIELD_ALIAS,
  NEXORA_FIELD_IDEA,
  NEXORA_FIELD_VENTURE_ID,
} from "@/lib/fixtures/nexora-field-venture";
import { buildAllOutputs } from "./output-builder";
import type { CreationOutput } from "./types";
import { registerOutputs } from "./output-registry";

export const NEXORA_E2E_MISSION_ID = "mc-nexora-field-e2e-5350";

export interface NexoraE2EResult {
  missionId: string;
  ventureSlug: string;
  ventureId: string;
  outputs: CreationOutput[];
  outputTypes: string[];
  allGenerated: boolean;
  disclaimer: string;
}

export async function runNexoraFieldE2EPipeline(): Promise<NexoraE2EResult> {
  const outputs = await buildAllOutputs({
    missionId: NEXORA_E2E_MISSION_ID,
    ventureId: NEXORA_FIELD_VENTURE_ID,
    ventureSlug: NEXORA_FIELD_ALIAS,
    ventureName: "NEXORA FIELD",
    ideaText: NEXORA_FIELD_IDEA,
  });

  registerOutputs(outputs);

  const expectedTypes = [
    "VENTURE_OUTPUT",
    "WEBSITE_OUTPUT",
    "WEB_APPLICATION_OUTPUT",
    "MOBILE_APPLICATION_OUTPUT",
    "BACKEND_OUTPUT",
    "DEPLOYMENT_OUTPUT",
  ];

  const generatedTypes = new Set(outputs.map((o) => o.type));
  const allGenerated = expectedTypes.every((t) => generatedTypes.has(t as CreationOutput["type"]));

  return {
    missionId: NEXORA_E2E_MISSION_ID,
    ventureSlug: NEXORA_FIELD_ALIAS,
    ventureId: NEXORA_FIELD_VENTURE_ID,
    outputs,
    outputTypes: outputs.map((o) => o.type),
    allGenerated,
    disclaimer:
      "NEXORA FIELD es caso de validación E2E genérico. Fixtures y adapters reutilizan motores públicos sin lógica hardcoded.",
  };
}

export function getNexoraStudioHref(): string {
  return `/studio/${NEXORA_E2E_MISSION_ID}`;
}
