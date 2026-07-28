/** PROGRAM 6050 — Pipeline transitions (explicit adapters / application commands). */

import type { DeliveryStage } from "./types";
import { DELIVERY_PIPELINE } from "./types";

export const PIPELINE_TRANSITIONS: ReadonlyArray<{
  from: DeliveryStage;
  to: DeliveryStage;
  via: string;
}> = [
  { from: "Artifact", to: "Output", via: "CreateOutputFromArtifacts | OutputAdapters" },
  { from: "Output", to: "Codebase", via: "GenerateCodebase | CodeProjectAdapter" },
  { from: "Codebase", to: "Build", via: "CompileCodebase | StartBuild" },
  { from: "Build", to: "Preview", via: "CreatePreviewFromBuild | PreviewRuntimeAdapter" },
  { from: "Preview", to: "Release", via: "CreateRelease | ReleaseRegistry" },
  { from: "Release", to: "Deployment", via: "DeployRelease | PreviewDeploymentAdapter" },
];

export function nextStage(stage: DeliveryStage): DeliveryStage | undefined {
  const idx = DELIVERY_PIPELINE.indexOf(stage);
  if (idx < 0 || idx >= DELIVERY_PIPELINE.length - 1) return undefined;
  return DELIVERY_PIPELINE[idx + 1];
}

export function assertTransition(from: DeliveryStage, to: DeliveryStage): void {
  const allowed = PIPELINE_TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!allowed) {
    throw new Error(`Invalid delivery transition: ${from} → ${to}`);
  }
}

export function transitionVia(from: DeliveryStage, to: DeliveryStage): string {
  assertTransition(from, to);
  return PIPELINE_TRANSITIONS.find((t) => t.from === from && t.to === to)!.via;
}
