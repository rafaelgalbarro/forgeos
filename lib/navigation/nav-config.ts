/** PROGRAM 4100 + 4255 — Unified product navigation registry (re-exports sidebar-items). */

import type { SidebarItem } from "./sidebar-items";
import {
  LEGACY_SIDEBAR_ITEMS,
  PRIMARY_SIDEBAR_ITEMS,
  SECONDARY_SIDEBAR_ITEMS,
  SIDEBAR_ITEMS,
} from "./sidebar-items";
import { filterVisibleSidebarItems, isNavActive } from "./safe-navigation";

export type { SidebarItem, SidebarSection, SidebarStatus } from "./sidebar-items";
export {
  SIDEBAR_ITEMS,
  PRIMARY_SIDEBAR_ITEMS,
  SECONDARY_SIDEBAR_ITEMS,
  SYSTEM_SIDEBAR_ITEMS,
  LEGACY_SIDEBAR_ITEMS,
  getSidebarItemById,
} from "./sidebar-items";

/** @deprecated Use SidebarSection from sidebar-items */
export type NavTier = "primary" | "secondary" | "legacy" | "dev";

/** @deprecated Use SidebarItem from sidebar-items */
export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  description?: string;
  tier: NavTier;
  devOnly?: boolean;
  children?: { label: string; href: string }[];
}

function toNavItem(item: SidebarItem): NavItem {
  const tier: NavTier =
    item.section === "primary"
      ? "primary"
      : item.section === "secondary"
        ? "secondary"
        : item.status === "legacy"
          ? "legacy"
          : "dev";
  return {
    id: item.id,
    label: item.label,
    href: item.href,
    icon: item.icon,
    description: item.description,
    tier,
    devOnly: item.developmentOnly,
    children: item.children,
  };
}

/** Program 4255 — simplified primary navigation. */
export const PRIMARY_NAV: NavItem[] = PRIMARY_SIDEBAR_ITEMS.map(toNavItem);

export const SECONDARY_NAV: NavItem[] = SECONDARY_SIDEBAR_ITEMS.map(toNavItem);

export const LEGACY_NAV: NavItem[] = LEGACY_SIDEBAR_ITEMS.map(toNavItem);

export const SIDEBAR_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

export { isNavActive };

export function filterNavForEnvironment(items: NavItem[]): NavItem[] {
  const visibleIds = new Set(
    filterVisibleSidebarItems(SIDEBAR_ITEMS).map((i) => i.id)
  );
  return items.filter((item) => visibleIds.has(item.id));
}
