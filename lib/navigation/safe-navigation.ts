/** Light navigation helpers — metadata + href validation only (no heavy engines). */

import type { SidebarItem } from "./sidebar-items";
import { LEGACY_SIDEBAR_ITEMS, SIDEBAR_ITEMS } from "./sidebar-items";

/** Known product routes that resolve to a page or redirect. */
const KNOWN_HREFS = new Set([
  "/",
  "/command-center",
  "/mission-control",
  "/missions",
  "/studio",
  "/review",
  "/company",
  "/activity",
  "/ventures",
  "/ventures/aurea-facilities",
  "/ventures/demo-venture-vandl",
  "/marketplace",
  "/capital",
  "/os/capital",
  "/production",
  "/settings",
  "/labs",
  "/ceo",
  "/live",
  "/build",
  "/os/build",
  "/deployments",
  "/network",
  "/self-evolution",
  "/admin",
  "/enterprise",
  "/customer-success",
  "/os",
  "/os/creator",
  "/dashboard",
  "/founder",
  "/creator",
  "/ai",
  "/docs",
  "/website-factory",
  "/mobile-factory",
  "/application-factory",
]);

/** Legacy href aliases — old paths that still resolve. */
const LEGACY_HREF_ALIASES: Record<string, string> = {
  "/ventures/aurea-facilities": "/ventures",
};

export function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isFeatureFlagEnabled(flag?: string): boolean {
  if (!flag) return true;
  if (flag === "labs") {
    return process.env.NEXT_PUBLIC_ENABLE_LABS === "true";
  }
  const envKey = `NEXT_PUBLIC_FF_${flag.replace(/-/g, "_").toUpperCase()}`;
  return process.env[envKey] === "true";
}

export function resolveLegacyHref(href: string): string {
  const normalized = href.split("?")[0].replace(/\/$/, "") || "/";
  return LEGACY_HREF_ALIASES[normalized] ?? normalized;
}

export function isValidSidebarHref(href: string): boolean {
  const normalized = href.split("?")[0].replace(/\/$/, "") || "/";
  if (KNOWN_HREFS.has(normalized)) return true;
  if (normalized.startsWith("/ventures/")) return true;
  if (normalized.startsWith("/venture/")) return true;
  if (normalized.startsWith("/os/")) return true;
  if (normalized.startsWith("/mission-control")) return true;
  if (normalized.startsWith("/missions/")) return true;
  if (normalized.startsWith("/studio/")) return true;
  if (normalized.startsWith("/review")) return true;
  if (normalized.startsWith("/company/")) return true;
  return false;
}

export function filterVisibleSidebarItems(items: SidebarItem[]): SidebarItem[] {
  return items.filter((item) => {
    if (item.status === "hidden") return false;
    if (item.developmentOnly && !isDevelopmentEnvironment() && !isFeatureFlagEnabled(item.requiredFeatureFlag)) {
      return false;
    }
    if (item.requiredFeatureFlag && !isDevelopmentEnvironment() && !isFeatureFlagEnabled(item.requiredFeatureFlag)) {
      return false;
    }
    return true;
  });
}

export function getVisiblePrimarySidebarItems(): SidebarItem[] {
  return filterVisibleSidebarItems(SIDEBAR_ITEMS.filter((i) => i.section === "primary"));
}

export function getVisibleSecondarySidebarItems(): SidebarItem[] {
  return filterVisibleSidebarItems(SIDEBAR_ITEMS.filter((i) => i.section === "secondary"));
}

export function getVisibleAdvancedSidebarItems(): SidebarItem[] {
  return filterVisibleSidebarItems(SIDEBAR_ITEMS.filter((i) => i.section === "advanced"));
}

export function getSystemSidebarItem(id: string): SidebarItem | undefined {
  return SIDEBAR_ITEMS.find((i) => i.section === "system" && i.id === id);
}

export function getLegacySidebarItems(): SidebarItem[] {
  return LEGACY_SIDEBAR_ITEMS;
}

export function isNavActive(pathname: string, href: string): boolean {
  const normalized = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const target = href.split("?")[0].replace(/\/$/, "") || "/";
  if (target === "/") {
    return normalized === "/";
  }
  if (target === "/ventures") {
    return normalized === "/ventures" || normalized.startsWith("/ventures/") || normalized.startsWith("/venture/");
  }
  if (target === "/company") {
    return normalized === "/company" || normalized.startsWith("/company/");
  }
  if (target === "/studio") {
    return normalized === "/studio" || normalized.startsWith("/studio/");
  }
  if (target === "/mission-control") {
    return (
      normalized === "/mission-control" ||
      normalized.startsWith("/mission-control/") ||
      normalized.startsWith("/missions/")
    );
  }
  if (target === "/build") {
    return normalized === "/build" || normalized.startsWith("/build/") || normalized === "/os/build" || normalized.startsWith("/os/build/") || normalized === "/deployments";
  }
  if (target === "/capital") {
    return normalized === "/capital" || normalized.startsWith("/os/capital");
  }
  if (target === "/os") {
    return normalized === "/os" || normalized.startsWith("/os/");
  }
  return normalized === target || normalized.startsWith(`${target}/`);
}
