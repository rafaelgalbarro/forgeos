/** ForgeOS OS — command palette registry (RC2 + Program 4100). */

import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { PRODUCT_COMMANDS } from "@/lib/navigation";
import { OS_NAV_ITEMS } from "./navigation";
import type { OsCommand } from "./types";

function productToOsCommand(cmd: (typeof PRODUCT_COMMANDS)[number]): OsCommand {
  return {
    id: `product-${cmd.id}`,
    label: cmd.label,
    description: cmd.description,
    href: cmd.href,
    keywords: cmd.keywords,
    group: cmd.group,
  };
}

export function buildOsCommands(): OsCommand[] {
  const navCommands: OsCommand[] = OS_NAV_ITEMS.map((item) => ({
    id: `nav-${item.id}`,
    label: `Ir a ${item.label}`,
    description: item.description,
    href: item.href,
    keywords: [item.label, item.id, item.description],
    group: "navigate",
  }));

  const productCommands = PRODUCT_COMMANDS.map(productToOsCommand);

  return [
    ...productCommands,
    {
      id: "launch-build",
      label: "Lanzar Build",
      description: "Abrir plataforma de build",
      href: "/os/build",
      action: "launch-build",
      keywords: ["build", "deploy", "release"],
      group: "execute",
    },
    {
      id: "search",
      label: "Buscar en ForgeOS",
      description: "Búsqueda universal",
      action: "search",
      keywords: ["buscar", "search", "find"],
      group: "search",
    },
    {
      id: "knowledge-query",
      label: "Consultar Knowledge",
      description: "Knowledge hub VANDL",
      href: `/venture/${VANDL_VENTURE_ID}/knowledge`,
      keywords: ["knowledge", "docs", "documentos"],
      group: "navigate",
    },
    {
      id: "run-workers",
      label: "Ejecutar Workers",
      description: "Ver actividad del equipo IA",
      href: `/os/workspace/${VANDL_VENTURE_ID}`,
      keywords: ["workers", "equipo", "ia"],
      group: "execute",
    },
    {
      id: "home",
      label: "Ir a Home",
      description: "Escritorio ForgeOS",
      href: "/os",
      keywords: ["home", "escritorio", "desktop"],
      group: "navigate",
    },
    ...navCommands,
  ];
}

export function filterOsCommands(query: string, limit = 14): OsCommand[] {
  const q = query.trim().toLowerCase();
  const all = buildOsCommands();
  if (!q) return all.slice(0, limit);

  return all
    .filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.keywords?.some((k) => k.toLowerCase().includes(q))
    )
    .slice(0, limit);
}
