/** PROGRAM 4400 — Website Export (file manifest, Next.js scaffold as data). */

import type { ExportBundle, WebsiteProject } from "./types";
import { getTemplateById } from "./templates";

const MANIFEST_VERSION = "1.0.0";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function generateExportBundle(project: WebsiteProject): ExportBundle {
  const slug = slugify(project.name);
  const template = getTemplateById(project.templateId);

  const files: ExportBundle["files"] = [
    { path: "package.json", kind: "file", description: "Dependencias Next.js + Tailwind + shadcn/ui", contentPreview: '{ "name": "' + slug + '", "dependencies": { "next": "15.x" } }' },
    { path: "next.config.ts", kind: "file", description: "Configuración Next.js App Router" },
    { path: "tailwind.config.ts", kind: "file", description: "Tokens de diseño y preset Tailwind" },
    { path: "postcss.config.mjs", kind: "file", description: "PostCSS para Tailwind" },
    { path: "tsconfig.json", kind: "file", description: "TypeScript strict" },
    { path: "app/layout.tsx", kind: "file", description: "Root layout con metadata SEO" },
    { path: "app/page.tsx", kind: "file", description: "Página principal" },
    { path: "app/globals.css", kind: "file", description: "Estilos globales + variables CSS de marca" },
    { path: "components/ui/", kind: "directory", description: "Componentes shadcn/ui" },
    { path: "components/sections/Hero.tsx", kind: "file", description: "Hero section generada" },
    { path: "components/sections/Features.tsx", kind: "file", description: "Grid de features" },
    { path: "components/sections/CTA.tsx", kind: "file", description: "Call to action" },
    { path: "lib/brand.ts", kind: "file", description: "Tokens de marca exportados" },
    { path: "public/favicon.ico", kind: "file", description: "Favicon placeholder" },
    { path: ".env.example", kind: "file", description: "Variables de entorno de ejemplo" },
    { path: "README.md", kind: "file", description: "Instrucciones de desarrollo y deploy" },
  ];

  for (const page of project.pages) {
    if (page.slug === "home") continue;
    files.push({
      path: `app/${page.slug}/page.tsx`,
      kind: "file",
      description: `Página: ${page.title}`,
    });
  }

  for (const comp of project.components) {
    files.push({
      path: `components/sections/${comp}.tsx`,
      kind: "file",
      description: `Componente: ${comp}`,
    });
  }

  return {
    projectId: project.id,
    projectName: project.name,
    templateId: project.templateId,
    framework: "nextjs",
    files,
    manifestVersion: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

export function formatExportManifest(bundle: ExportBundle): string {
  const template = getTemplateById(bundle.templateId);
  const lines = [
    `# Export Manifest — ${bundle.projectName}`,
    `Template: ${template?.name ?? bundle.templateId}`,
    `Framework: ${bundle.framework}`,
    `Generated: ${bundle.generatedAt}`,
    `Files: ${bundle.files.length}`,
    "",
    "## File tree",
    ...bundle.files.map((f) => `- [${f.kind}] ${f.path} — ${f.description}`),
  ];
  return lines.join("\n");
}

export function createDownloadStub(bundle: ExportBundle): { filename: string; note: string } {
  return {
    filename: `${slugify(bundle.projectName)}-forgeos-export.zip`,
    note: "Descarga stub — conecta GitHub y Deploy Preview para export real.",
  };
}
