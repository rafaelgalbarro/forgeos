/** PROGRAM 6030 — CapabilityResolver V2. */

import type { CapabilityName, CapabilityRequest, CapabilityResult } from "../../domain/capabilities";
import {
  ApplicationFactoryAdapter,
  BackendFactoryAdapter,
  BrandFactoryAdapter,
  BuildPipelineAdapter,
  CodebaseAdapter,
  DeploymentAdapter,
  MobileFactoryAdapter,
  PreviewRuntimeAdapter,
  VentureFactoryAdapter,
  WebsiteFactoryAdapter,
  type FactoryAdapter,
} from "./factory-adapters";
import type { CapabilityResolverPort } from "./types";
import { fixtureCapabilityResult } from "./runtime-scheduler-port";

const CAPABILITY_MAP: Record<CapabilityName, FactoryAdapter> = {
  GenerateMarketResearch: VentureFactoryAdapter,
  GenerateBrand: BrandFactoryAdapter,
  GenerateWebsite: WebsiteFactoryAdapter,
  GenerateWebApplication: ApplicationFactoryAdapter,
  GenerateMobileApplication: MobileFactoryAdapter,
  GenerateBackend: BackendFactoryAdapter,
  GenerateCodebase: CodebaseAdapter,
  BuildCodebase: BuildPipelineAdapter,
  CreatePreview: PreviewRuntimeAdapter,
  DeployRelease: DeploymentAdapter,
};

export class CapabilityResolverV2 implements CapabilityResolverPort {
  isCapabilityAvailable(name: CapabilityName): boolean {
    return name in CAPABILITY_MAP;
  }

  async resolve(request: CapabilityRequest): Promise<CapabilityResult> {
    if (request.dryRun) {
      return {
        ...fixtureCapabilityResult(request.capability, {
          dryRun: true,
          inputs: request.inputs,
        }),
        warnings: ["DRY_RUN — capability not executed"],
      };
    }

    const adapter = CAPABILITY_MAP[request.capability];
    if (!adapter) {
      return {
        capability: request.capability,
        ok: false,
        artifactRefs: [],
        outputs: {},
        warnings: [],
        error: `No adapter for capability ${request.capability}`,
        usedFixture: false,
      };
    }

    return adapter.invoke(request);
  }
}

export function createCapabilityResolverV2(): CapabilityResolverPort {
  return new CapabilityResolverV2();
}

export function listResolvableCapabilities(): CapabilityName[] {
  return Object.keys(CAPABILITY_MAP) as CapabilityName[];
}
