/** RC9 — Marketplace thin wrapper (adapter over ecosystem + skills-store). */

export {
  searchEcosystemPacks,
  getEcosystemFeatured,
  getEcosystemListings,
  getCombinedMarketplaceStats,
  searchCrmPacks,
  browseCatalog,
  getFeaturedListings,
  getMarketplaceStats,
  syncStoreState,
} from "@/lib/ecosystem/marketplace-engine";

export type { EcosystemPack, EcosystemListing, EcosystemCatalogFilter } from "@/lib/ecosystem/types";
