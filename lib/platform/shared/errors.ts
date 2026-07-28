/** ForgeOS Platform — error types. */

import type { PillarId } from "./types";

export class PlatformError extends Error {
  readonly code: string;
  readonly pillarId?: PillarId;

  constructor(message: string, code = "PLATFORM_ERROR", pillarId?: PillarId) {
    super(message);
    this.name = "PlatformError";
    this.code = code;
    this.pillarId = pillarId;
  }
}

export class PillarNotReadyError extends PlatformError {
  constructor(pillarId: PillarId, detail?: string) {
    super(
      detail ?? `Pillar "${pillarId}" is not ready (status: scaffold).`,
      "PILLAR_NOT_READY",
      pillarId,
    );
    this.name = "PillarNotReadyError";
  }
}

export class PillarNotFoundError extends PlatformError {
  constructor(pillarId: string) {
    super(`Pillar "${pillarId}" is not registered.`, "PILLAR_NOT_FOUND");
    this.name = "PillarNotFoundError";
  }
}
