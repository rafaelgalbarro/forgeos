/** Venture Ecosystem — program-specific scaffold types. */

export type VentureEcosystemModuleId = "capital" | "marketplace";

/** Scaffold — marketplace listing. */
export interface MarketplaceListing {
  id: string;
  title: string;
  category: "template" | "service" | "venture" | "integration";
  status: "draft" | "published" | "archived";
  vendorId: string;
  createdAt: string;
}

/** Scaffold — capital raise round. */
export interface CapitalRaiseRound {
  id: string;
  ventureId: string;
  round: "pre-seed" | "seed" | "series-a" | "series-b";
  targetAmount: number;
  currency: string;
  status: "planning" | "active" | "closed";
}
