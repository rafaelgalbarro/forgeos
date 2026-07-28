/** ForgeOS OS — founder-facing navigation registry (RC2). */

import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import type { OsBreadcrumb, OsModuleId, OsNavItem } from "./types";

/** Modules visible to founders — never Runtime, Event Bus, or Workers. */
export const OS_NAV_ITEMS: OsNavItem[] = [
  { id: "ceo", label: "CEO", href: "/os/ceo", icon: "◉", description: "Director General", pinned: true },
  { id: "portfolio", label: "Portfolio", href: "/os/portfolio", icon: "◫", description: "Empresas y ventures", pinned: true },
  { id: "workspace", label: "Workspace", href: `/os/workspace/${VANDL_VENTURE_ID}`, icon: "▣", description: "Venture activo", pinned: true },
  { id: "creator", label: "Creator", href: "/os/creator", icon: "✦", description: "Crear nueva empresa", pinned: true },
  { id: "build", label: "Build", href: "/os/build", icon: "⚒", description: "Plataforma de build" },
  { id: "knowledge", label: "Knowledge", href: `/os/knowledge`, icon: "◎", description: "Conocimiento del portfolio" },
  { id: "capital", label: "Capital", href: "/os/capital", icon: "◈", description: "Capital y financiación" },
  { id: "marketplace", label: "Marketplace", href: "/os/marketplace", icon: "◇", description: "Plantillas y activos" },
  { id: "analytics", label: "Analytics", href: "/os/analytics", icon: "↗", description: "Métricas del portfolio" },
  { id: "calendar", label: "Calendar", href: "/os/calendar", icon: "▦", description: "Agenda ejecutiva" },
  { id: "settings", label: "Settings", href: "/os/settings", icon: "⚙", description: "Preferencias del OS" },
];

export const OS_DOCK_ITEMS: OsNavItem[] = [
  { id: "home", label: "Home", href: "/os", icon: "⌂", description: "Escritorio" },
  ...OS_NAV_ITEMS.filter((i) => i.pinned),
];

export function getOsNavItem(id: OsModuleId): OsNavItem | undefined {
  return OS_NAV_ITEMS.find((i) => i.id === id);
}

export function getOsNavItemByHref(href: string): OsNavItem | undefined {
  const normalized = href.split("?")[0] ?? href;
  if (normalized === "/os" || normalized === "/os/") {
    return { id: "home", label: "Home", href: "/os", icon: "⌂", description: "Escritorio" };
  }
  return OS_NAV_ITEMS.find((i) => normalized === i.href || normalized.startsWith(`${i.href}/`));
}

export function buildOsBreadcrumbs(pathname: string): OsBreadcrumb[] {
  const crumbs: OsBreadcrumb[] = [{ label: "ForgeOS", href: "/os" }];
  if (pathname === "/os" || pathname === "/os/") {
    crumbs.push({ label: "Home" });
    return crumbs;
  }

  const item = getOsNavItemByHref(pathname);
  if (item) {
    crumbs.push({ label: item.label });
    return crumbs;
  }

  if (pathname.startsWith("/os/workspace/")) {
    const id = pathname.split("/")[3] ?? "venture";
    crumbs.push({ label: "Workspace", href: "/os/portfolio" });
    crumbs.push({ label: id });
    return crumbs;
  }

  crumbs.push({ label: "Módulo" });
  return crumbs;
}
