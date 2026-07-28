import type { VentureProject } from "@/lib/domain/venture";
import { resolveVandlVenture } from "@/lib/fixtures/vandl-venture";
import { getVentureById } from "@/lib/store/ventures";

/** Resolve venture from localStorage store or RC1 fixtures (VANDL). */
export function resolveVenture(id: string): VentureProject | undefined {
  return getVentureById(id) ?? resolveVandlVenture(id);
}
