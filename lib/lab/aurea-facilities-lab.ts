/** Program 10000 — AUREA FACILITIES lab harness. */

import { runVentureE2EEngine } from "@/lib/venture-e2e";
import type { VentureE2ESnapshot } from "@/lib/venture-e2e";
import { AUREA_FACILITIES_ALIAS } from "@/lib/fixtures/aurea-facilities-venture";

export type AureaFacilitiesLabSnapshot = VentureE2ESnapshot;

export async function runAureaFacilitiesLabHarness(
  idOrSlug: string = AUREA_FACILITIES_ALIAS
): Promise<AureaFacilitiesLabSnapshot> {
  return runVentureE2EEngine(idOrSlug);
}
