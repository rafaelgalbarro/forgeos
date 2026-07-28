/** Program 4000 — Founder Zero lab harness. */

import { runFounderZeroLab } from "@/lib/founder-zero";
import type { FounderZeroSnapshot } from "@/lib/founder-zero";

export type FounderZeroLabSnapshot = FounderZeroSnapshot;

export async function runFounderZeroLabHarness(
  ventureId?: string
): Promise<FounderZeroLabSnapshot> {
  return runFounderZeroLab(ventureId);
}
