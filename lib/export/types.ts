import type { VentureProject } from "@/lib/domain/venture";

export type ExportFormat = "markdown";

export type ExportKind =
  | "project_brief"
  | "investor_pack"
  | "prd"
  | "research"
  | "simulator"
  | "roadmap"
  | "build_plan";

export interface ExportDocument {
  kind: ExportKind;
  format: ExportFormat;
  filename: string;
  content: string;
  title: string;
}

export interface ExportKindMeta {
  kind: ExportKind;
  label: string;
  description: string;
}

export interface VentureExportInput {
  venture: VentureProject;
}

export const EXPORT_KINDS_UI: ExportKindMeta[] = [
  {
    kind: "project_brief",
    label: "Exportar Project Brief",
    description: "Resumen ejecutivo compacto del venture",
  },
  {
    kind: "investor_pack",
    label: "Exportar Investor Pack",
    description: "Documento completo para inversores",
  },
  {
    kind: "prd",
    label: "Exportar PRD",
    description: "Product Requirements Document",
  },
  {
    kind: "research",
    label: "Exportar Research",
    description: "Informe de mercado y competencia",
  },
  {
    kind: "simulator",
    label: "Exportar Simulator Report",
    description: "Venture Score y escenarios económicos",
  },
  {
    kind: "build_plan",
    label: "Exportar Build Plan",
    description: "Handoff técnico para Cursor / Claude",
  },
];
