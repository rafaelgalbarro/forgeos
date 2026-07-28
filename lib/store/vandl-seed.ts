import { VANDL_VENTURE, VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { getVentureById, saveVenture } from "@/lib/store/ventures";

/** Seed VANDL into localStorage if not already present. */
export function ensureVandlSeeded(): void {
  if (typeof window === "undefined") return;
  if (!getVentureById(VANDL_VENTURE_ID)) {
    saveVenture(VANDL_VENTURE);
  }
}

export function isVandlSeeded(): boolean {
  return !!getVentureById(VANDL_VENTURE_ID);
}
