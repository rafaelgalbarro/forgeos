import type { VentureProject } from "@/lib/domain/venture";
import { buildQueue } from "../repository";
import { buildTimeline } from "../timeline";
import { generateAllPrompts, CONNECTOR_STUBS } from "../monitor";
import type { BuildEngineOutput } from "../types";

export function runBuildEngine(ventures: VentureProject[]): BuildEngineOutput {
  const queue = buildQueue(ventures);
  const timeline = buildTimeline(ventures);

  const prompts = ventures
    .filter((v) => v.productPRD)
    .flatMap((v) => {
      try {
        return generateAllPrompts(v);
      } catch (error) {
        console.error("[build-engine] generateAllPrompts failed:", v.id, error);
        return [];
      }
    })
    .slice(0, 10);

  return {
    queue,
    timeline,
    prompts,
    connectors: CONNECTOR_STUBS,
    computedAt: new Date().toISOString(),
  };
}
