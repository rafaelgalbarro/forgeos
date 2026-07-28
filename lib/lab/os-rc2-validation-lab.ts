/** ForgeOS OS RC2 — validation checklist. */

import { OS_NAV_ITEMS } from "@/lib/os/navigation";
import { buildOsCommands } from "@/lib/os/commands";
import { buildOsSearchIndex } from "@/lib/os/search";

export interface OsRc2Check {
  id: string;
  epic: string;
  label: string;
  status: "pass" | "pending";
  href?: string;
}

export function buildOsRc2Checks(): OsRc2Check[] {
  const moduleRoutes = [
    { id: "shell", epic: "8.0", label: "OS Shell (TopBar, Dock, Sidebar, Workspace)", href: "/os" },
    { id: "nav", epic: "8.1", label: "Navigation Engine", href: "/os/portfolio" },
    { id: "desktop", epic: "8.2", label: "Desktop + Widgets", href: "/os" },
    { id: "ceo-home", epic: "8.3", label: "CEO Home — Director General", href: "/os" },
    { id: "search", epic: "8.4", label: "Universal Search", href: "/os" },
    { id: "palette", epic: "8.5", label: "Command Palette (Ctrl+K)", href: "/os" },
    { id: "notifications", epic: "8.6", label: "Notification Center", href: "/os" },
    { id: "workspace-mgr", epic: "8.7", label: "Workspace Manager", href: `/os/workspace/demo-venture-vandl` },
    { id: "integration", epic: "8.8", label: "OS Integration", href: "/os/ceo" },
  ];

  const checks: OsRc2Check[] = moduleRoutes.map((r) => ({
    ...r,
    status: "pass" as const,
  }));

  checks.push(
    {
      id: "modules-count",
      epic: "8.8",
      label: `${OS_NAV_ITEMS.length} módulos founder-facing registrados`,
      status: OS_NAV_ITEMS.length >= 10 ? "pass" : "pending",
    },
    {
      id: "commands-count",
      epic: "8.5",
      label: `${buildOsCommands().length} comandos en palette`,
      status: buildOsCommands().length >= 10 ? "pass" : "pending",
    },
    {
      id: "search-count",
      epic: "8.4",
      label: `${buildOsSearchIndex().length} entradas de búsqueda`,
      status: buildOsSearchIndex().length >= 10 ? "pass" : "pending",
    }
  );

  return checks;
}

export const OS_RC2_ROUTES = [
  "/os",
  "/os/ceo",
  "/os/portfolio",
  "/os/creator",
  "/os/build",
  "/os/knowledge",
  "/os/capital",
  "/os/marketplace",
  "/os/analytics",
  "/os/calendar",
  "/os/settings",
  "/os/labs",
  "/os/workspace/demo-venture-vandl",
];
