/**
 * Branded entity identifiers — IDs of different aggregates are not interchangeable.
 * PROGRAM 6010 — Canonical Domain Model
 */

declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type EntityId = Brand<string, "EntityId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type FounderId = Brand<string, "FounderId">;
export type VentureId = Brand<string, "VentureId">;
export type MissionId = Brand<string, "MissionId">;
export type DecisionId = Brand<string, "DecisionId">;
export type ArtifactId = Brand<string, "ArtifactId">;
export type ProductId = Brand<string, "ProductId">;
export type OutputId = Brand<string, "OutputId">;
export type CodebaseId = Brand<string, "CodebaseId">;
export type BuildId = Brand<string, "BuildId">;
export type PreviewId = Brand<string, "PreviewId">;
export type ReleaseId = Brand<string, "ReleaseId">;
export type DeploymentId = Brand<string, "DeploymentId">;
export type OperationId = Brand<string, "OperationId">;
export type EvolutionProposalId = Brand<string, "EvolutionProposalId">;
export type EventId = Brand<string, "EventId">;
export type PortfolioId = Brand<string, "PortfolioId">;
export type SharedAssetId = Brand<string, "SharedAssetId">;
export type AllocationId = Brand<string, "AllocationId">;

function assertNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return trimmed;
}

export function asEntityId(value: string): EntityId {
  return assertNonEmpty(value, "EntityId") as EntityId;
}
export function asWorkspaceId(value: string): WorkspaceId {
  return assertNonEmpty(value, "WorkspaceId") as WorkspaceId;
}
export function asFounderId(value: string): FounderId {
  return assertNonEmpty(value, "FounderId") as FounderId;
}
export function asVentureId(value: string): VentureId {
  return assertNonEmpty(value, "VentureId") as VentureId;
}
export function asMissionId(value: string): MissionId {
  return assertNonEmpty(value, "MissionId") as MissionId;
}
export function asDecisionId(value: string): DecisionId {
  return assertNonEmpty(value, "DecisionId") as DecisionId;
}
export function asArtifactId(value: string): ArtifactId {
  return assertNonEmpty(value, "ArtifactId") as ArtifactId;
}
export function asProductId(value: string): ProductId {
  return assertNonEmpty(value, "ProductId") as ProductId;
}
export function asOutputId(value: string): OutputId {
  return assertNonEmpty(value, "OutputId") as OutputId;
}
export function asCodebaseId(value: string): CodebaseId {
  return assertNonEmpty(value, "CodebaseId") as CodebaseId;
}
export function asBuildId(value: string): BuildId {
  return assertNonEmpty(value, "BuildId") as BuildId;
}
export function asPreviewId(value: string): PreviewId {
  return assertNonEmpty(value, "PreviewId") as PreviewId;
}
export function asReleaseId(value: string): ReleaseId {
  return assertNonEmpty(value, "ReleaseId") as ReleaseId;
}
export function asDeploymentId(value: string): DeploymentId {
  return assertNonEmpty(value, "DeploymentId") as DeploymentId;
}
export function asOperationId(value: string): OperationId {
  return assertNonEmpty(value, "OperationId") as OperationId;
}
export function asEvolutionProposalId(value: string): EvolutionProposalId {
  return assertNonEmpty(value, "EvolutionProposalId") as EvolutionProposalId;
}
export function asEventId(value: string): EventId {
  return assertNonEmpty(value, "EventId") as EventId;
}
export function asPortfolioId(value: string): PortfolioId {
  return assertNonEmpty(value, "PortfolioId") as PortfolioId;
}
export function asSharedAssetId(value: string): SharedAssetId {
  return assertNonEmpty(value, "SharedAssetId") as SharedAssetId;
}
export function asAllocationId(value: string): AllocationId {
  return assertNonEmpty(value, "AllocationId") as AllocationId;
}

/** Opaque string equality without leaking brand erasure in call sites */
export function idEquals(a: string, b: string): boolean {
  return a === b;
}
