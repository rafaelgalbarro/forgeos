/**
 * CEO pillar adapter — optional read-only bridge to @/lib/ceo-office types.
 * NOT CONNECTED — engine does not import lib/ceo or lib/fos.
 */

import type { CeoOfficeData, ExecutiveVentureCard } from "@/lib/ceo-office";

export type { CeoOfficeData, ExecutiveVentureCard };

export const ceoOfficeAdapter = {
  readonly: true,
  module: "ceo-office",
  pillarId: "ceo" as const,
  connected: false,

  isAvailable(): boolean {
    return false;
  },

  async describeBridge(): Promise<string> {
    return "ceo-office adapter registered but not connected (scaffold).";
  },
} as const;
