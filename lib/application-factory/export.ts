/** Program 4500 — Full app scaffold manifest (Next.js + Supabase). */

import type { AppProject, ExportBundle } from "./types";

const MANIFEST_VERSION = "1.0.0";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function generateExportBundle(project: AppProject): ExportBundle {
  const slug = slugify(project.name);

  const files: ExportBundle["files"] = [
    { path: "package.json", kind: "file", description: "Next.js 15 + Supabase + Tailwind", contentPreview: `{ "name": "${slug}", "dependencies": { "next": "15.x", "@supabase/supabase-js": "2.x" } }` },
    { path: "next.config.ts", kind: "file", description: "Configuración Next.js App Router" },
    { path: "tailwind.config.ts", kind: "file", description: "Tailwind CSS" },
    { path: "tsconfig.json", kind: "file", description: "TypeScript strict" },
    { path: ".env.example", kind: "file", description: "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY" },
    { path: "app/layout.tsx", kind: "file", description: "Root layout" },
    { path: "app/(app)/layout.tsx", kind: "file", description: "Layout autenticado con sidebar" },
    { path: "app/(auth)/layout.tsx", kind: "file", description: "Layout auth (login/register)" },
    { path: "app/(admin)/layout.tsx", kind: "file", description: "Layout panel admin" },
    { path: "lib/supabase/client.ts", kind: "file", description: "Cliente Supabase browser" },
    { path: "lib/supabase/server.ts", kind: "file", description: "Cliente Supabase server" },
    { path: "lib/services/", kind: "directory", description: "Servicios de dominio" },
    { path: "supabase/migrations/", kind: "directory", description: "Migraciones SQL" },
    { path: "supabase/seed.sql", kind: "file", description: "Datos de seed" },
    { path: "middleware.ts", kind: "file", description: "Auth middleware + RBAC" },
    { path: "README.md", kind: "file", description: "Instrucciones de desarrollo y deploy" },
  ];

  if (project.frontend) {
    for (const page of project.frontend.pages) {
      const segment = page.route.replace(/^\//, "").replace(/\[id\]/g, "[id]");
      files.push({
        path: segment ? `app/(app)/${segment}/page.tsx` : "app/(app)/page.tsx",
        kind: "file",
        description: `Página: ${page.title}`,
      });
    }
  }

  if (project.api) {
    for (const route of project.api.routes) {
      const handlerPath = route.handler.replace("app/", "");
      if (!files.some((f) => f.path === handlerPath)) {
        files.push({ path: handlerPath, kind: "file", description: route.description });
      }
    }
  }

  if (project.tests) {
    for (const t of [...project.tests.unitTests, ...project.tests.integrationTests, ...project.tests.e2eTests]) {
      files.push({ path: t.file, kind: "file", description: t.description });
    }
  }

  return {
    projectId: project.id,
    projectName: project.name,
    framework: "nextjs",
    database: "supabase",
    files,
    manifestVersion: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

export function formatExportManifest(bundle: ExportBundle): string {
  const lines = [
    `# Export Manifest — ${bundle.projectName}`,
    `Framework: ${bundle.framework} + ${bundle.database}`,
    `Generated: ${bundle.generatedAt}`,
    `Files: ${bundle.files.length}`,
    "",
    "## File tree",
    ...bundle.files.map((f) => `- [${f.kind}] ${f.path} — ${f.description}`),
  ];
  return lines.join("\n");
}

export function createDownloadStub(bundle: ExportBundle): { filename: string; content: string } {
  return {
    filename: `${bundle.projectName.toLowerCase().replace(/\s+/g, "-")}-manifest.txt`,
    content: formatExportManifest(bundle),
  };
}
