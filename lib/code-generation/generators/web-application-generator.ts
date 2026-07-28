/** PROGRAM 5360 — Web Application generator (Next.js + Supabase). */

import type { CodeGenerationInput, CodeProject, CodeRoute } from "../types";
import { buildFiles } from "../file-builder";
import { buildProject } from "../project-builder";
import { getTemplateForProjectType } from "../templates/loader";
import type { TemplateContext } from "../templates/types";
import { applyValidationToProject } from "../code-validator";
import { slugify } from "../code-project";
import {
  buildPackageJson,
  buildReadme,
  buildTsConfig,
  extractModulesFromIdea,
  fhisButton,
  pascalCase,
} from "./shared";
import { buildDependenciesFromTemplate } from "../dependency-builder";
import { buildEnvExampleContent, buildEnvVarsFromTemplate } from "../environment-builder";

const ROLES = [
  { id: "admin", label: "Admin", permissions: ["*"] },
  { id: "manager", label: "Manager", permissions: ["read", "write", "assign"] },
  { id: "technician", label: "Technician", permissions: ["read", "update_own"] },
  { id: "client", label: "Client", permissions: ["read_own"] },
];

export async function generateWebApplicationProject(input: CodeGenerationInput): Promise<CodeProject> {
  const template = getTemplateForProjectType("web_application");
  const slug = slugify(input.ventureName);
  const modules = input.modules ?? extractModulesFromIdea(input.ideaText);

  const ctx: TemplateContext = {
    name: input.ventureName,
    slug,
    ventureName: input.ventureName,
    ideaText: input.ideaText,
    modules,
    sourceArtifactIds: input.sourceArtifactIds ?? [],
  };

  const deps = buildDependenciesFromTemplate(template);
  const envVars = buildEnvVarsFromTemplate(template);

  const moduleFiles = modules.flatMap((mod) => [
    {
      path: `app/(app)/${mod}/page.tsx`,
      content: generateModulePage(mod, ctx),
      purpose: `Module page: ${mod}`,
    },
    {
      path: `lib/services/${mod}-service.ts`,
      content: generateService(mod),
      purpose: `Service: ${mod}`,
    },
    {
      path: `lib/repositories/${mod}-repository.ts`,
      content: generateRepository(mod),
      purpose: `Repository: ${mod}`,
    },
  ]);

  const files = buildFiles([
    { path: "package.json", content: buildPackageJson(slug, template, deps), purpose: "Dependencies" },
    { path: "tsconfig.json", content: buildTsConfig(), purpose: "TypeScript config" },
    { path: "next.config.ts", content: `import type { NextConfig } from "next";\nexport default { reactStrictMode: true } satisfies NextConfig;\n`, purpose: "Next config" },
    { path: "middleware.ts", content: generateMiddleware(), purpose: "Auth middleware + RBAC" },
    { path: "app/layout.tsx", content: generateAppRootLayout(ctx), purpose: "Root layout" },
    { path: "app/(auth)/layout.tsx", content: generateAuthLayout(), purpose: "Auth layout" },
    { path: "app/(auth)/login/page.tsx", content: generateLoginPage(), purpose: "Login page" },
    { path: "app/(app)/layout.tsx", content: generateAppLayout(modules), purpose: "App shell with sidebar" },
    { path: "app/(app)/dashboard/page.tsx", content: generateDashboard(modules, ctx), purpose: "Dashboard" },
    { path: "app/(admin)/layout.tsx", content: generateAdminLayout(), purpose: "Admin layout" },
    { path: "app/(admin)/admin/page.tsx", content: generateAdminPage(), purpose: "Admin panel" },
    ...moduleFiles,
    { path: "components/ui/Button.tsx", content: fhisButton("Button"), purpose: "UI button" },
    { path: "components/ui/DataTable.tsx", content: generateDataTable(), purpose: "Generic data table" },
    { path: "components/ui/FilterBar.tsx", content: generateFilterBar(), purpose: "Filter bar" },
    { path: "components/ui/EmptyState.tsx", content: generateEmptyState(), purpose: "Empty state" },
    { path: "lib/supabase/client.ts", content: generateSupabaseClient(), purpose: "Supabase browser client" },
    { path: "lib/supabase/server.ts", content: generateSupabaseServer(), purpose: "Supabase server client" },
    { path: "lib/auth/roles.ts", content: generateRolesConfig(), purpose: "Roles and permissions" },
    { path: "lib/types/api.ts", content: generateApiContracts(modules), purpose: "API type contracts" },
    { path: "supabase/migrations/001_initial.sql", content: generateDbSchema(modules), purpose: "Initial DB migration (not executed)" },
    { path: "supabase/seed.sql", content: generateSeedData(modules), purpose: "Seed fixtures" },
    { path: ".env.example", content: buildEnvExampleContent(envVars), purpose: "Env template" },
    { path: "README.md", content: buildReadme(ctx, "Next.js 15 · Supabase · TypeScript"), purpose: "Documentation" },
    { path: "tests/dashboard.test.ts", content: generateAppTest(slug), purpose: "Dashboard smoke test" },
  ]);

  const routes: CodeRoute[] = [
    { id: "r-dash", path: "/dashboard", label: "Dashboard", file: "app/(app)/dashboard/page.tsx", auth: true },
    { id: "r-login", path: "/login", label: "Login", file: "app/(auth)/login/page.tsx" },
    { id: "r-admin", path: "/admin", label: "Admin", file: "app/(admin)/admin/page.tsx", auth: true },
    ...modules.map((mod, i) => ({
      id: `r-${mod}`,
      path: `/${mod}`,
      label: pascalCase(mod.replace(/_/g, " ")),
      file: `app/(app)/${mod}/page.tsx`,
      auth: true,
    })),
  ];

  const project = buildProject({
    missionId: input.missionId,
    ventureId: input.ventureId,
    outputId: input.outputId,
    name: input.ventureName,
    projectType: "web_application",
    template,
    files,
    routes,
    database: {
      provider: "supabase",
      migrations: ["supabase/migrations/001_initial.sql"],
      seedFiles: ["supabase/seed.sql"],
      schemaFiles: ["supabase/migrations/001_initial.sql"],
    },
    api: {
      basePath: "/api",
      endpoints: modules.map((mod) => ({
        method: "GET",
        path: `/api/${mod}`,
        handler: `lib/services/${mod}-service.ts`,
        description: `List ${mod}`,
      })),
    },
    tests: { framework: "vitest", files: ["tests/dashboard.test.ts"] },
  });

  return applyValidationToProject(project);
}

function generateMiddleware(): string {
  return `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected && !request.cookies.get("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
`;
}

function generateAppRootLayout(ctx: TemplateContext): string {
  return `export const metadata = { title: "${ctx.ventureName}" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
`;
}

function generateAuthLayout(): string {
  return `export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-gray-50">{children}</div>;
}
`;
}

function generateLoginPage(): string {
  return `"use client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <form className="w-full max-w-sm space-y-4 rounded-lg border bg-white p-8 shadow" onSubmit={(e) => e.preventDefault()}>
      <h1 className="text-xl font-bold">Sign in</h1>
      <input type="email" placeholder="Email" className="w-full rounded border px-3 py-2" />
      <input type="password" placeholder="Password" className="w-full rounded border px-3 py-2" />
      <Button type="submit">Sign in (demo)</Button>
    </form>
  );
}
`;
}

function generateAppLayout(modules: string[]): string {
  return `import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <nav className="space-y-2">
          <Link href="/dashboard" className="block rounded px-2 py-1 hover:bg-gray-200">Dashboard</Link>
          ${modules.map((m) => `<Link href="/${m}" className="block rounded px-2 py-1 hover:bg-gray-200 capitalize">${m.replace(/_/g, " ")}</Link>`).join("\n          ")}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
`;
}

function generateAdminLayout(): string {
  return `export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-900 text-white p-6">{children}</div>;
}
`;
}

function generateDashboard(modules: string[], ctx: TemplateContext): string {
  return `import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  const stats = ${JSON.stringify(modules.map((m) => ({ label: m, value: 0 })))};
  return (
    <div>
      <h1 className="text-2xl font-bold">${ctx.ventureName} Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded border p-4">
            <div className="text-sm text-gray-500 capitalize">{s.label.replace(/_/g, " ")}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>
      <EmptyState message="Connect your data source to see live metrics." />
    </div>
  );
}
`;
}

function generateAdminPage(): string {
  return `import { ROLES } from "@/lib/auth/roles";

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      <ul className="mt-4 space-y-2">
        {ROLES.map((r) => (
          <li key={r.id} className="rounded bg-slate-800 p-3">
            <strong>{r.label}</strong>: {r.permissions.join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
`;
}

function generateModulePage(mod: string, ctx: TemplateContext): string {
  const Name = pascalCase(mod);
  return `import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { get${Name}List } from "@/lib/services/${mod}-service";

export default async function ${Name}Page() {
  const items = await get${Name}List();
  return (
    <div>
      <h1 className="text-2xl font-bold capitalize">${mod.replace(/_/g, " ")}</h1>
      <p className="text-gray-600 mt-1">${ctx.ventureName}</p>
      <FilterBar />
      <DataTable columns={["id", "name", "status"]} rows={items} />
    </div>
  );
}
`;
}

function generateService(mod: string): string {
  const Name = pascalCase(mod);
  return `import { ${Name}Repository } from "@/lib/repositories/${mod}-repository";

export interface ${Name}Item { id: string; name: string; status: string; }

export async function get${Name}List(): Promise<${Name}Item[]> {
  return ${Name}Repository.list();
}
`;
}

function generateRepository(mod: string): string {
  const Name = pascalCase(mod);
  return `import type { ${Name}Item } from "@/lib/services/${mod}-service";

const FIXTURES: ${Name}Item[] = [
  { id: "1", name: "Sample ${mod} A", status: "active" },
  { id: "2", name: "Sample ${mod} B", status: "pending" },
];

export const ${Name}Repository = {
  list: async () => FIXTURES,
  getById: async (id: string) => FIXTURES.find((i) => i.id === id),
};
`;
}

function generateDataTable(): string {
  return `interface DataTableProps {
  columns: string[];
  rows: Record<string, string>[];
}

export function DataTable({ columns, rows }: DataTableProps) {
  if (rows.length === 0) return <p className="text-gray-500 py-8">No data</p>;
  return (
    <table className="mt-4 w-full border-collapse text-sm">
      <thead><tr>{columns.map((c) => <th key={c} className="border-b p-2 text-left capitalize">{c}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => (
        <tr key={i}>{columns.map((c) => <td key={c} className="border-b p-2">{row[c] ?? "—"}</td>)}</tr>
      ))}</tbody>
    </table>
  );
}
`;
}

function generateFilterBar(): string {
  return `"use client";
export function FilterBar() {
  return (
    <div className="mt-4 flex gap-2">
      <input placeholder="Search…" className="rounded border px-3 py-1 text-sm" />
      <select className="rounded border px-2 py-1 text-sm"><option>All statuses</option></select>
    </div>
  );
}
`;
}

function generateEmptyState(): string {
  return `export function EmptyState({ message }: { message: string }) {
  return <div className="mt-8 rounded border border-dashed p-12 text-center text-gray-500">{message}</div>;
}
`;
}

function generateSupabaseClient(): string {
  return `import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}
`;
}

function generateSupabaseServer(): string {
  return `import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}
`;
}

function generateRolesConfig(): string {
  return `export const ROLES = ${JSON.stringify(ROLES, null, 2)} as const;
export type RoleId = typeof ROLES[number]["id"];
`;
}

function generateApiContracts(modules: string[]): string {
  return modules
    .map(
      (m) =>
        `export interface ${pascalCase(m)}Dto { id: string; name: string; status: "active" | "pending" | "archived"; createdAt: string; }`
    )
    .join("\n\n");
}

function generateDbSchema(modules: string[]): string {
  const tables = modules
    .map(
      (m) => `-- Table: ${m}
CREATE TABLE IF NOT EXISTS ${m} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);`
    )
    .join("\n\n");
  return `-- Migration 001 — generated, NOT executed by ForgeOS\n${tables}\n`;
}

function generateSeedData(modules: string[]): string {
  return modules
    .map((m) => `INSERT INTO ${m} (name, status) VALUES ('Demo ${m}', 'active');`)
    .join("\n");
}

function generateAppTest(slug: string): string {
  return `import { describe, it, expect } from "vitest";
describe("${slug} app", () => { it("loads", () => expect(true).toBe(true)); });
`;
}
