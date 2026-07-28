/** PROGRAM 6040 — Build pipeline / factory / preview / deployment adapters */

import type { DomainEventEnvelope } from "../envelope";
import { wrapLegacyEvent } from "./wrap-legacy";

export function adaptBuildPipelineEvent(input: {
  id: string;
  type: string;
  timestamp?: string;
  buildId: string;
  status?: string;
  missionId?: string;
  workspaceId?: string;
  payload?: Record<string, unknown>;
}): DomainEventEnvelope {
  return wrapLegacyEvent({
    integrationType: "BUILD_PIPELINE_EVENT_INGESTED",
    mappedDomainType: "BUILD_STATE_CHANGED",
    catalogKind: "domain",
    source: "build-pipeline",
    sourceEventId: input.id,
    occurredAt: input.timestamp,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    aggregateType: "Build",
    aggregateId: input.buildId,
    actorKind: "runtime",
    actorId: "build-pipeline",
    payload: {
      buildType: input.type,
      status: input.status ?? null,
      to: input.status ?? null,
      ...(input.payload ?? {}),
    },
  });
}

export function adaptPreviewRuntimeEvent(input: {
  id: string;
  type: string;
  timestamp?: string;
  previewId: string;
  status?: string;
  missionId?: string;
  workspaceId?: string;
  payload?: Record<string, unknown>;
}): DomainEventEnvelope {
  return wrapLegacyEvent({
    integrationType: "PREVIEW_RUNTIME_EVENT_INGESTED",
    mappedDomainType: "PREVIEW_STATE_CHANGED",
    catalogKind: "domain",
    source: "preview-runtime",
    sourceEventId: input.id,
    occurredAt: input.timestamp,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    aggregateType: "Preview",
    aggregateId: input.previewId,
    actorKind: "runtime",
    actorId: "preview-runtime",
    payload: {
      previewType: input.type,
      status: input.status ?? null,
      to: input.status ?? null,
      ...(input.payload ?? {}),
    },
  });
}

export function adaptDeploymentEvent(input: {
  id: string;
  type: string;
  timestamp?: string;
  deploymentId: string;
  status?: string;
  missionId?: string;
  workspaceId?: string;
  payload?: Record<string, unknown>;
}): DomainEventEnvelope {
  return wrapLegacyEvent({
    integrationType: "DEPLOYMENT_EVENT_INGESTED",
    mappedDomainType: "DEPLOYMENT_STATE_CHANGED",
    catalogKind: "domain",
    source: "deployment",
    sourceEventId: input.id,
    occurredAt: input.timestamp,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    aggregateType: "Deployment",
    aggregateId: input.deploymentId,
    actorKind: "runtime",
    actorId: "deployment",
    payload: {
      deploymentType: input.type,
      status: input.status ?? null,
      to: input.status ?? null,
      ...(input.payload ?? {}),
    },
  });
}

export function adaptFactoryEvent(input: {
  id: string;
  type: string;
  timestamp?: string;
  factoryId: string;
  label?: string;
  missionId?: string;
  workspaceId?: string;
  payload?: Record<string, unknown>;
}): DomainEventEnvelope {
  return wrapLegacyEvent({
    integrationType: "FACTORY_EVENT_INGESTED",
    mappedDomainType: "ORCHESTRATION_STEP_COMPLETED",
    catalogKind: "application",
    source: "factories",
    sourceEventId: input.id,
    occurredAt: input.timestamp,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    aggregateType: "System",
    aggregateId: input.factoryId,
    actorKind: "worker",
    actorId: input.factoryId,
    payload: {
      factoryType: input.type,
      label: input.label ?? input.type,
      ...(input.payload ?? {}),
    },
  });
}
