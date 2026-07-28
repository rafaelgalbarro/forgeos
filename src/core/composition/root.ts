/**
 * PROGRAM 6085 — Single server-side composition root.
 * No import-time side effects: call getCompositionRoot() / createCompositionRoot().
 */

import { createApplicationLayer, type ApplicationLayer } from "../application/handlers";
import type { ApplicationPorts } from "../application/ports";
import { createOrchestrationKernel, type OrchestrationKernel } from "../orchestration";
import { createDeliveryKernel, type DeliveryKernel } from "../delivery";
import { createCanonicalEventBus, type CanonicalEventBus } from "../events/bus";
import { readV2FeatureFlags, type V2FeatureFlags } from "../migration/feature-flags";
import { getServiceRegistry } from "../performance/composition/lazy-services";
import {
  createFileBackedPorts,
  type FileBackedStore,
  persistFileStore,
} from "./file-store";

export type PreviewClassification =
  | "REAL_READY"
  | "REAL_DEGRADED"
  | "BUILD_FAILED"
  | "RUNTIME_FAILED"
  | "PLAN_ONLY"
  | "UNAVAILABLE";

export interface CompositionRoot {
  application: ApplicationLayer;
  ports: ApplicationPorts;
  store: FileBackedStore;
  orchestration: OrchestrationKernel;
  delivery: DeliveryKernel;
  eventBus: CanonicalEventBus;
  flags: V2FeatureFlags;
  persist: () => void;
  /** SERVICE→IMPLEMENTATION map for health/docs */
  serviceMap: CompositionServiceMap;
  /** Lazy service registry (PROGRAM 6100) */
  lazyServices: ReturnType<typeof getServiceRegistry>;
}

export interface CompositionServiceMap {
  commandBus: string;
  queryBus: string;
  eventBus: string;
  workflowEngine: string;
  missionRepository: string;
  ventureRepository: string;
  outputRepository: string;
  artifactRepository: string;
  projectRepository: string;
  releaseRepository: string;
  deploymentRepository: string;
  capabilityRegistry: string;
  capabilityExecutor: string;
  provenanceGraph: string;
  impactAnalyzer: string;
  telemetry: string;
  featureFlags: string;
  approvals: string;
  persistence: string;
}

let rootSingleton: CompositionRoot | null = null;

export function createCompositionRoot(options?: {
  storeDir?: string;
  sandboxAvailable?: boolean;
}): CompositionRoot {
  const { ports, store, persist } = createFileBackedPorts({
    storeDir: options?.storeDir,
    sandboxAvailable: options?.sandboxAvailable,
  });
  const application = createApplicationLayer(ports);
  const orchestration = createOrchestrationKernel();
  const delivery = createDeliveryKernel();
  const eventBus = createCanonicalEventBus();
  const flags = readV2FeatureFlags();

  const serviceMap: CompositionServiceMap = {
    commandBus: "src/core/application/commands/bus.ts → createCommandBus (registered in handlers/index)",
    queryBus: "src/core/application/queries/bus.ts → createQueryBus",
    eventBus: "src/core/events/bus/canonical-bus.ts → createCanonicalEventBus",
    workflowEngine: "src/core/orchestration/kernel/orchestration-kernel.ts → createOrchestrationKernel",
    missionRepository: "file-store UnitOfWork.missions (.forgeos/v2-store)",
    ventureRepository: "file-store UnitOfWork.ventures",
    outputRepository: "file-store UnitOfWork.outputs + delivery.outputs",
    artifactRepository: "delivery.artifacts (persisted via deliverySnapshots)",
    projectRepository: "file-store UnitOfWork.codebases (project/code manifest)",
    releaseRepository: "file-store UnitOfWork.releases + delivery.releases",
    deploymentRepository: "file-store UnitOfWork.deployments + delivery.deployments",
    capabilityRegistry: "orchestration capability resolver V2",
    capabilityExecutor: "orchestration executeNode + application factories/execution ports",
    provenanceGraph: "delivery.lineage / version-graph",
    impactAnalyzer: "delivery.changeImpact",
    telemetry: "application ports.telemetry",
    featureFlags: "src/core/migration/feature-flags.ts (defaults OFF)",
    approvals: "orchestration approval gates + application decision commands",
    persistence: ".forgeos/v2-store/application-state.json (atomic rename)",
  };

  // Hydrate delivery/orchestration from disk when present
  for (const [missionId, snap] of store.deliverySnapshots.entries()) {
    void missionId;
    void snap;
    // snapshots are rehydrated by integration runtime when needed
  }

  const root: CompositionRoot = {
    application,
    ports,
    store,
    orchestration,
    delivery,
    eventBus,
    flags,
    persist: () => {
      persistFileStore(store, options?.storeDir);
      persist();
    },
    serviceMap,
    lazyServices: getServiceRegistry(),
  };

  return root;
}

/**
 * Lazy singleton for Next.js server runtime. Safe to call repeatedly.
 * Does not run side effects on import.
 */
export function getCompositionRoot(): CompositionRoot {
  if (!rootSingleton) {
    rootSingleton = createCompositionRoot();
  }
  return rootSingleton;
}

/** Test / certification helper — reset singleton. */
export function resetCompositionRoot(): void {
  rootSingleton = null;
}

export function setCompositionRoot(root: CompositionRoot | null): void {
  rootSingleton = root;
}

export function isCompositionRootReady(): boolean {
  try {
    const root = getCompositionRoot();
    return Boolean(
      root.application.commandBus &&
        root.application.queryBus &&
        root.ports.uow &&
        root.orchestration &&
        root.delivery &&
        root.eventBus,
    );
  } catch {
    return false;
  }
}
