/** PROGRAM 5350 — Website output adapter (Website Factory preview/export). */

import type { CreationOutput, WebsiteOutputPayload } from "../types";
import { createOutputId } from "../output-registry";
import { WEBSITE_DEMO_PAGES } from "../demo-fixtures";

export interface WebsiteAdapterInput {
  missionId: string;
  ventureId?: string;
  ideaText: string;
  projectName: string;
}

export async function buildWebsiteOutput(input: WebsiteAdapterInput): Promise<CreationOutput> {
  const { createWebsiteProject } = await import("@/lib/website-factory");
  const { generateWebsitePreview } = await import("@/lib/website-factory/preview");

  const project = createWebsiteProject({
    name: input.projectName,
    templateId: "landing-saas",
    idea: { title: input.projectName, description: input.ideaText, audience: "general" },
  });

  const preview = generateWebsitePreview(project);
  const now = new Date().toISOString();

  const payload: WebsiteOutputPayload = {
    projectId: project.id,
    templateId: project.templateId,
    pages: WEBSITE_DEMO_PAGES.map((p) => ({ ...p, layout: "default" })),
    seo: { title: project.seo.title, description: project.seo.description },
    componentTree: project.components,
    responsiveBreakpoints: ["desktop", "tablet", "mobile"],
    exportPlan: "ZIP con archivos Next.js — demo export",
    vercelPreviewPlan: "DRY RUN — Vercel Preview URL simulada (no deploy real)",
  };

  return {
    outputId: createOutputId("WEBSITE_OUTPUT"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    type: "WEBSITE_OUTPUT",
    title: `${input.projectName} — Website`,
    status: "PREVIEW_READY",
    version: "1.0.0",
    createdAt: now,
    updatedAt: now,
    factoryProjectId: project.id,
    sourceArtifacts: [
      { artifactId: `art-web-${project.id}`, type: "website", label: "Website Project", href: `/website-factory/${project.id}` },
    ],
    previewMode: "sandbox",
    previewUrl: undefined,
    files: [
      { path: "app/page.tsx", kind: "file", description: "Home page" },
      { path: "app/layout.tsx", kind: "file", description: "Root layout" },
      { path: "components/", kind: "directory", description: "UI components" },
    ],
    routes: payload.pages,
    screenshots: [
      { id: "ss-desktop", label: "Desktop", device: "desktop", placeholder: true },
      { id: "ss-mobile", label: "Mobile", device: "mobile", placeholder: true },
    ],
    approvals: [],
    warnings: [
      { id: "w-web-preview", severity: "info", message: "Preview sandbox — sin URLs reales", code: "PREVIEW_SAFETY" },
    ],
    nextActions: [
      { id: "na-preview", label: "Abrir preview", kind: "preview" },
      { id: "na-export", label: "Exportar archivos", kind: "export", href: `/website-factory/${project.id}` },
      { id: "na-change", label: "Solicitar cambios", kind: "change_request" },
    ],
    payload,
    dataModel: undefined,
    apiSpec: undefined,
    validation: {
      score: 85,
      passed: true,
      checks: [
        { id: "pages", label: `${preview.pageCount} páginas generadas`, status: "pass" },
        { id: "components", label: `${preview.componentCount} componentes`, status: "pass" },
      ],
      source: "adapter",
    },
  };
}

export async function loadWebsiteProjectForPreview(projectId: string) {
  const { getProjectById } = await import("@/lib/website-factory");
  return getProjectById(projectId);
}
