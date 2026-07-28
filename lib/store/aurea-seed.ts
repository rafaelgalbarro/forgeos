import {
  AUREA_FACILITIES_VENTURE,
  AUREA_FACILITIES_VENTURE_ID,
} from "@/lib/fixtures/aurea-facilities-venture";
import { getVentureById, saveVenture } from "@/lib/store/ventures";

/** Seed AUREA FACILITIES into localStorage if not already present. */
export function ensureAureaSeeded(): void {
  if (typeof window === "undefined") return;
  if (!getVentureById(AUREA_FACILITIES_VENTURE_ID)) {
    saveVenture(AUREA_FACILITIES_VENTURE);
  }
}

export function isAureaSeeded(): boolean {
  return !!getVentureById(AUREA_FACILITIES_VENTURE_ID);
}
