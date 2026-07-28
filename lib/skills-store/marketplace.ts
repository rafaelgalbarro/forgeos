/** ForgeOS Universal Skill Store — marketplace listings (RC4.8). */

import { buildStoreCatalog } from "./registry";
import type { MarketplaceListing, StoreCategory, StoreItem } from "./types";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function mockRating(id: string): number {
  const h = hashSeed(id);
  return Math.round((3.5 + (h % 15) / 10) * 10) / 10;
}

function mockInstallCount(id: string): number {
  return (hashSeed(id) % 5000) + 120;
}

function mockReviewCount(id: string): number {
  return (hashSeed(id) % 200) + 8;
}

function toListing(item: StoreItem, featured: boolean): MarketplaceListing {
  const badges: string[] = [];
  if (item.status === "beta") badges.push("Beta");
  if (item.status === "sandbox") badges.push("Sandbox");
  if (featured) badges.push("Featured");
  if (item.category === "skills" && item.governanceRisk === "CRITICAL") badges.push("Governed");

  return {
    id: `mkt-${item.id}`,
    itemId: item.id,
    category: item.category,
    title: item.name,
    subtitle: item.description.slice(0, 80),
    featured,
    rating: mockRating(item.id),
    reviewCount: mockReviewCount(item.id),
    installCount: mockInstallCount(item.id),
    publisher: item.source.includes("forgeos") ? "ForgeOS Official" : "ForgeOS Community",
    priceLabel: "Free",
    badges,
  };
}

export function buildMarketplaceListings(): MarketplaceListing[] {
  const catalog = buildStoreCatalog().filter(
    (i) => i.category !== "versions" && i.category !== "dependencies"
  );

  const featuredIds = new Set(
    catalog
      .filter((i) => i.status === "active" || i.status === "beta")
      .slice(0, 12)
      .map((i) => i.id)
  );

  return catalog.map((item) => toListing(item, featuredIds.has(item.id)));
}

export function getFeaturedListings(limit = 8): MarketplaceListing[] {
  return buildMarketplaceListings()
    .filter((l) => l.featured)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function getMarketplaceByCategory(category: StoreCategory): MarketplaceListing[] {
  return buildMarketplaceListings().filter((l) => l.category === category);
}

export function getMarketplaceListing(itemId: string): MarketplaceListing | undefined {
  return buildMarketplaceListings().find((l) => l.itemId === itemId);
}

export function getMarketplaceStats(): {
  totalListings: number;
  featured: number;
  avgRating: number;
  totalInstalls: number;
  byCategory: Record<string, number>;
} {
  const listings = buildMarketplaceListings();
  const featured = listings.filter((l) => l.featured).length;
  const avgRating =
    listings.length > 0
      ? Math.round((listings.reduce((s, l) => s + l.rating, 0) / listings.length) * 10) / 10
      : 0;
  const totalInstalls = listings.reduce((s, l) => s + l.installCount, 0);
  const byCategory: Record<string, number> = {};
  for (const l of listings) {
    byCategory[l.category] = (byCategory[l.category] ?? 0) + 1;
  }
  return { totalListings: listings.length, featured, avgRating, totalInstalls, byCategory };
}
