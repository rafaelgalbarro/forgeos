/** Build Context — persisted via intelligence bridge (Sprint 3). */

import type { BuildContext } from "./types";
import {
  getBuildContext as bridgeGetBuildContext,
  loadBuildContext,
  setBuildContext as bridgeSetBuildContext,
} from "@/lib/persistence/bridges/intelligence-bridge";
import { getBuildContextRepository } from "@/lib/persistence";

export function getBuildContext(ventureId: string): BuildContext | undefined {
  return bridgeGetBuildContext(ventureId);
}

export function setBuildContext(context: BuildContext): BuildContext {
  return bridgeSetBuildContext(context);
}

export async function hydrateBuildContext(
  ventureId: string
): Promise<BuildContext | null> {
  return loadBuildContext(ventureId);
}

export function deleteBuildContext(ventureId: string): boolean {
  void getBuildContextRepository().delete(ventureId);
  return true;
}

export function listBuildContexts(): BuildContext[] {
  return [];
}

export function clearBuildContextStore(): void {
  // noop — persistence layer owns storage
}
