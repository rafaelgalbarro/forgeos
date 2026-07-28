/** ForgeOS OS — universal search index (RC2). */

import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { OS_NAV_ITEMS } from "./navigation";
import type { OsSearchResult } from "./types";

export function buildOsSearchIndex(): OsSearchResult[] {
  const results: OsSearchResult[] = [];

  for (const item of OS_NAV_ITEMS) {
    results.push({
      id: `module-${item.id}`,
      title: item.label,
      subtitle: item.description,
      href: item.href,
      category: "shortcut",
    });
  }

  results.push(
    {
      id: "venture-vandl",
      title: "VANDL",
      subtitle: "Venture demo del portfolio",
      href: `/os/workspace/${VANDL_VENTURE_ID}`,
      category: "venture",
    },
    {
      id: "timeline-vandl",
      title: "Timeline VANDL",
      subtitle: "Historial del venture",
      href: `/venture/${VANDL_VENTURE_ID}/timeline`,
      category: "timeline",
    },
    {
      id: "knowledge-vandl",
      title: "Knowledge VANDL",
      subtitle: "Documentos del venture",
      href: `/venture/${VANDL_VENTURE_ID}/knowledge`,
      category: "knowledge",
    },
    {
      id: "research-market",
      title: "Research — Mercado",
      subtitle: "Informe de mercado VANDL",
      href: `/os/workspace/${VANDL_VENTURE_ID}`,
      category: "research",
    },
    {
      id: "build-context",
      title: "Build Context",
      subtitle: "Contexto de build activo",
      href: "/os/build",
      category: "build",
    },
    {
      id: "build-release",
      title: "Release Manager",
      subtitle: "Último paquete de release",
      href: "/lab/release-manager",
      category: "build",
    },
    {
      id: "deployment-preview",
      title: "Deployment Preview",
      subtitle: "Entorno de preview",
      href: "/os/build",
      category: "deployment",
    },
    {
      id: "capital-overview",
      title: "Capital Overview",
      subtitle: "Runway y financiación",
      href: "/os/capital",
      category: "capital",
    },
    {
      id: "settings-general",
      title: "Settings",
      subtitle: "Preferencias del sistema",
      href: "/os/settings",
      category: "settings",
    },
    {
      id: "worker-ceo",
      title: "CEO Worker",
      subtitle: "Director General activo",
      href: "/os/ceo",
      category: "worker",
    },
    {
      id: "worker-research",
      title: "Research Worker",
      subtitle: "Análisis de mercado",
      href: `/os/workspace/${VANDL_VENTURE_ID}`,
      category: "worker",
    }
  );

  return results;
}

export function searchOs(query: string, limit = 12): OsSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return buildOsSearchIndex().slice(0, limit);

  return buildOsSearchIndex()
    .filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    )
    .slice(0, limit);
}
