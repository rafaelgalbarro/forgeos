import type { VentureProject, VentureSectionId } from "@/lib/domain/venture";
import type { ExportKind } from "./types";

export const PENDING = "*Pendiente de completar*";

export function slugifyFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "venture";
}

const KIND_SUFFIX: Record<ExportKind, string> = {
  project_brief: "project-brief",
  investor_pack: "investor-pack",
  prd: "prd",
  research: "research",
  simulator: "simulator-report",
  roadmap: "roadmap",
  build_plan: "build-plan",
};

export function buildExportFilename(venture: VentureProject, kind: ExportKind): string {
  const slug = slugifyFilename(venture.name);
  const date = new Date().toISOString().slice(0, 10);
  return `forgeos-${slug}-${KIND_SUFFIX[kind]}-${date}.md`;
}

export function getSectionContent(venture: VentureProject, id: VentureSectionId): string {
  const section = venture.sections.find((s) => s.id === id);
  if (!section?.content?.trim()) return PENDING;
  return section.content.trim();
}

export function formatExportDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `€${Math.round(value / 1_000)}K`;
  return `€${value}`;
}

export function listOrPending(items: string[] | undefined, limit?: number): string {
  if (!items?.length) return PENDING;
  const slice = limit ? items.slice(0, limit) : items;
  return slice.map((item) => `- ${item}`).join("\n");
}

export function valueOrPending(value: string | number | null | undefined): string {
  if (value == null || (typeof value === "string" && !value.trim())) return PENDING;
  return String(value);
}

export function exportHeader(title: string, venture: VentureProject): string {
  return `# ${title}

**Proyecto:** ${venture.name}  
**Generado por:** ForgeOS App Factory  
**Fecha:** ${formatExportDate(new Date().toISOString())}  
**Venture ID:** ${venture.id}

---

`;
}

/** Client-side download helper. Safe to call only in browser. */
export function downloadMarkdownFile(content: string, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".md") ? filename : `${filename}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
