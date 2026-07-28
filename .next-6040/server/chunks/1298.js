"use strict";exports.id=1298,exports.ids=[1298],exports.modules={12287:(a,b,c)=>{function d(a){return a.envVars.map(a=>({key:a.key,description:a.description,example:a.example,required:a.required,secret:a.secret}))}function e(a){return a.map(a=>{let b=`# ${a.description}${a.required?" (required)":""}`;return`${b}
${a.key}=${a.example}`}).join("\n\n")+"\n"}c.d(b,{a:()=>d,r:()=>e})},19394:(a,b,c)=>{c.d(b,{C:()=>e});var d=c(80083);function e(a){return a.map(a=>(0,d.ui)(a.path,a.content,a.purpose,{generatedBy:a.generatedBy,sourceArtifactIds:a.sourceArtifactIds}))}},21298:(a,b,c)=>{c.d(b,{generateWebApplicationProject:()=>m});var d=c(19394),e=c(48876),f=c(44887),g=c(30880),h=c(80083),i=c(62074),j=c(70045),k=c(12287);let l=[{id:"admin",label:"Admin",permissions:["*"]},{id:"manager",label:"Manager",permissions:["read","write","assign"]},{id:"technician",label:"Technician",permissions:["read","update_own"]},{id:"client",label:"Client",permissions:["read_own"]}];async function m(a){var b,c,m,n,o;let p=(0,f.nx)("web_application"),q=(0,h.Yv)(a.ventureName),r=a.modules??(0,i.I$)(a.ideaText),s={name:a.ventureName,slug:q,ventureName:a.ventureName,ideaText:a.ideaText,modules:r,sourceArtifactIds:a.sourceArtifactIds??[]},t=(0,j.YJ)(p),u=(0,k.a)(p),v=r.flatMap(a=>[{path:`app/(app)/${a}/page.tsx`,content:function(a,b){let c=(0,i.fL)(a);return`import { DataTable } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import { get${c}List } from "@/lib/services/${a}-service";

export default async function ${c}Page() {
  const items = await get${c}List();
  return (
    <div>
      <h1 className="text-2xl font-bold capitalize">${a.replace(/_/g," ")}</h1>
      <p className="text-gray-600 mt-1">${b.ventureName}</p>
      <FilterBar />
      <DataTable columns={["id", "name", "status"]} rows={items} />
    </div>
  );
}
`}(a,s),purpose:`Module page: ${a}`},{path:`lib/services/${a}-service.ts`,content:function(a){let b=(0,i.fL)(a);return`import { ${b}Repository } from "@/lib/repositories/${a}-repository";

export interface ${b}Item { id: string; name: string; status: string; }

export async function get${b}List(): Promise<${b}Item[]> {
  return ${b}Repository.list();
}
`}(a),purpose:`Service: ${a}`},{path:`lib/repositories/${a}-repository.ts`,content:function(a){let b=(0,i.fL)(a);return`import type { ${b}Item } from "@/lib/services/${a}-service";

const FIXTURES: ${b}Item[] = [
  { id: "1", name: "Sample ${a} A", status: "active" },
  { id: "2", name: "Sample ${a} B", status: "pending" },
];

export const ${b}Repository = {
  list: async () => FIXTURES,
  getById: async (id: string) => FIXTURES.find((i) => i.id === id),
};
`}(a),purpose:`Repository: ${a}`}]),w=(0,d.C)([{path:"package.json",content:(0,i.Jh)(q,p,t),purpose:"Dependencies"},{path:"tsconfig.json",content:(0,i.cZ)(),purpose:"TypeScript config"},{path:"next.config.ts",content:`import type { NextConfig } from "next";
export default { reactStrictMode: true } satisfies NextConfig;
`,purpose:"Next config"},{path:"middleware.ts",content:`import { NextResponse } from "next/server";
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
`,purpose:"Auth middleware + RBAC"},{path:"app/layout.tsx",content:(b=s,`export const metadata = { title: "${b.ventureName}" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
`),purpose:"Root layout"},{path:"app/(auth)/layout.tsx",content:`export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-gray-50">{children}</div>;
}
`,purpose:"Auth layout"},{path:"app/(auth)/login/page.tsx",content:`"use client";
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
`,purpose:"Login page"},{path:"app/(app)/layout.tsx",content:(c=r,`import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <nav className="space-y-2">
          <Link href="/dashboard" className="block rounded px-2 py-1 hover:bg-gray-200">Dashboard</Link>
          ${c.map(a=>`<Link href="/${a}" className="block rounded px-2 py-1 hover:bg-gray-200 capitalize">${a.replace(/_/g," ")}</Link>`).join("\n          ")}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
`),purpose:"App shell with sidebar"},{path:"app/(app)/dashboard/page.tsx",content:(m=r,n=s,`import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  const stats = ${JSON.stringify(m.map(a=>({label:a,value:0})))};
  return (
    <div>
      <h1 className="text-2xl font-bold">${n.ventureName} Dashboard</h1>
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
`),purpose:"Dashboard"},{path:"app/(admin)/layout.tsx",content:`export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-900 text-white p-6">{children}</div>;
}
`,purpose:"Admin layout"},{path:"app/(admin)/admin/page.tsx",content:`import { ROLES } from "@/lib/auth/roles";

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
`,purpose:"Admin panel"},...v,{path:"components/ui/Button.tsx",content:(0,i.xT)("Button"),purpose:"UI button"},{path:"components/ui/DataTable.tsx",content:`interface DataTableProps {
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
`,purpose:"Generic data table"},{path:"components/ui/FilterBar.tsx",content:`"use client";
export function FilterBar() {
  return (
    <div className="mt-4 flex gap-2">
      <input placeholder="Search…" className="rounded border px-3 py-1 text-sm" />
      <select className="rounded border px-2 py-1 text-sm"><option>All statuses</option></select>
    </div>
  );
}
`,purpose:"Filter bar"},{path:"components/ui/EmptyState.tsx",content:`export function EmptyState({ message }: { message: string }) {
  return <div className="mt-8 rounded border border-dashed p-12 text-center text-gray-500">{message}</div>;
}
`,purpose:"Empty state"},{path:"lib/supabase/client.ts",content:`import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}
`,purpose:"Supabase browser client"},{path:"lib/supabase/server.ts",content:`import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}
`,purpose:"Supabase server client"},{path:"lib/auth/roles.ts",content:`export const ROLES = ${JSON.stringify(l,null,2)} as const;
export type RoleId = typeof ROLES[number]["id"];
`,purpose:"Roles and permissions"},{path:"lib/types/api.ts",content:r.map(a=>`export interface ${(0,i.fL)(a)}Dto { id: string; name: string; status: "active" | "pending" | "archived"; createdAt: string; }`).join("\n\n"),purpose:"API type contracts"},{path:"supabase/migrations/001_initial.sql",content:function(a){let b=a.map(a=>`-- Table: ${a}
CREATE TABLE IF NOT EXISTS ${a} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);`).join("\n\n");return`-- Migration 001 — generated, NOT executed by ForgeOS
${b}
`}(r),purpose:"Initial DB migration (not executed)"},{path:"supabase/seed.sql",content:r.map(a=>`INSERT INTO ${a} (name, status) VALUES ('Demo ${a}', 'active');`).join("\n"),purpose:"Seed fixtures"},{path:".env.example",content:(0,k.r)(u),purpose:"Env template"},{path:"README.md",content:(0,i.pw)(s,"Next.js 15 \xb7 Supabase \xb7 TypeScript"),purpose:"Documentation"},{path:"tests/dashboard.test.ts",content:(o=q,`import { describe, it, expect } from "vitest";
describe("${o} app", () => { it("loads", () => expect(true).toBe(true)); });
`),purpose:"Dashboard smoke test"}]),x=[{id:"r-dash",path:"/dashboard",label:"Dashboard",file:"app/(app)/dashboard/page.tsx",auth:!0},{id:"r-login",path:"/login",label:"Login",file:"app/(auth)/login/page.tsx"},{id:"r-admin",path:"/admin",label:"Admin",file:"app/(admin)/admin/page.tsx",auth:!0},...r.map((a,b)=>({id:`r-${a}`,path:`/${a}`,label:(0,i.fL)(a.replace(/_/g," ")),file:`app/(app)/${a}/page.tsx`,auth:!0}))],y=(0,e.a)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,name:a.ventureName,projectType:"web_application",template:p,files:w,routes:x,database:{provider:"supabase",migrations:["supabase/migrations/001_initial.sql"],seedFiles:["supabase/seed.sql"],schemaFiles:["supabase/migrations/001_initial.sql"]},api:{basePath:"/api",endpoints:r.map(a=>({method:"GET",path:`/api/${a}`,handler:`lib/services/${a}-service.ts`,description:`List ${a}`}))},tests:{framework:"vitest",files:["tests/dashboard.test.ts"]}});return(0,g.A)(y)}},48876:(a,b,c)=>{c.d(b,{a:()=>h});var d=c(50943),e=c(80083),f=c(70045),g=c(12287);function h(a){let b=new Date().toISOString(),c=(0,e.G0)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,projectType:a.projectType,name:a.name,templateId:a.template.id,framework:a.template.stack.framework,language:a.template.stack.language}),h=(0,g.a)(a.template),i=a.files.find(a=>"README.md"===a.path)?.content??"",j=a.files.find(a=>".env.example"===a.path)?.content??(0,g.r)(h),k={...c,files:a.files,directories:(0,e.b$)(a.files),dependencies:(0,f.YJ)(a.template),scripts:Object.entries(a.template.scripts).map(([a,b])=>({name:a,command:b,purpose:`Script: ${a}`})),environmentVariables:h,routes:a.routes??[],database:a.database,api:a.api,tests:a.tests,documentation:{readme:i,envExample:j},warnings:a.warnings??[],status:"GENERATED",generationMode:a.generationMode??"template",generatedAt:b,updatedAt:b};return{...k,manifest:(0,d.zF)(k)}}},50943:(a,b,c)=>{function d(a){let b={},c={};for(let d of a.dependencies)d.dev?c[d.name]=d.version:b[d.name]=d.version;let d={};for(let b of a.scripts)"dev"===b.name?d.dev=b.command:"build"===b.name?d.build=b.command:"start"===b.name?d.start=b.command:"test"===b.name&&(d.test=b.command);return d.install="npm install",{projectId:a.projectId,missionId:a.missionId,outputId:a.outputId,kind:({website:"website",web_application:"webapp",mobile:"mobile",backend:"backend",fullstack:"webapp"})[a.projectType],framework:a.framework,name:a.name,version:a.version,scripts:d,envVars:a.environmentVariables.map(a=>({key:a.key,value:a.example,source:"manifest",sensitive:a.secret})),routes:a.routes.map(a=>({path:a.path,label:a.label})),dependencies:b,devDependencies:Object.keys(c).length>0?c:void 0,declaredTests:a.tests?.files,generatedAt:a.generatedAt??a.updatedAt}}function e(a){return{...a,manifest:d(a)}}c.d(b,{dD:()=>e,zF:()=>d})},62074:(a,b,c)=>{c.d(b,{I$:()=>e,Jh:()=>f,cZ:()=>g,fL:()=>i,pw:()=>h,xT:()=>j});var d=c(70045);function e(a){let b=a.toLowerCase(),c=[];for(let[a,d]of Object.entries({technicians:["t\xe9cnico","technician","campo","field"],clients:["cliente","client","customer"],work_orders:["incidencia","orden","work order","ticket","servicio"],routes:["ruta","route","dispatch"],inventory:["inventario","inventory","stock","almac\xe9n"],billing:["factura","billing","invoice","cobro"],dashboard:["dashboard","panel","m\xe9trica"],auth:["auth","login","usuario","rol"]}))d.some(a=>b.includes(a))&&c.push(a);return 0===c.length&&c.push("dashboard","auth"),c}function f(a,b,c){return JSON.stringify({name:a,version:"0.1.0",private:!0,scripts:b.scripts,dependencies:(0,d.Nu)(c),devDependencies:(0,d.eh)(c)},null,2)}function g(){return JSON.stringify({compilerOptions:{target:"ES2017",lib:["dom","dom.iterable","esnext"],allowJs:!0,skipLibCheck:!0,strict:!0,noEmit:!0,esModuleInterop:!0,module:"esnext",moduleResolution:"bundler",resolveJsonModule:!0,isolatedModules:!0,jsx:"preserve",incremental:!0,paths:{"@/*":["./*"]}},include:["**/*.ts","**/*.tsx"],exclude:["node_modules"]},null,2)}function h(a,b){return`# ${a.ventureName}

> ${a.ideaText.slice(0,120)}

Generated by ForgeOS Code Generation (template). This project is **autonomous** — no ForgeOS internals.

## Stack

${b}

## Getting started

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Modules

${a.modules.map(a=>`- ${a}`).join("\n")}

## Notes

- Static validation only — compile verification is separate (5370)
- No real credentials — use .env.example placeholders
`}function i(a){return a.split(/[-_]/).map(a=>a.charAt(0).toUpperCase()+a.slice(1)).join("")}function j(a){return`/** FHIS-compatible inline component — autonomous, no ForgeOS imports */
import clsx from "clsx";

interface ${a}Props {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function ${a}({ children, variant = "primary", onClick, type = "button", disabled }: ${a}Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" && "border border-gray-300 bg-white hover:bg-gray-50",
        variant === "ghost" && "text-gray-700 hover:bg-gray-100",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
`}},70045:(a,b,c)=>{function d(a){let b=Object.entries(a.dependencies).map(([a,b])=>({name:a,version:b,dev:!1}));if(a.devDependencies)for(let[c,d]of Object.entries(a.devDependencies))b.push({name:c,version:d,dev:!0});return b}function e(a){let b={};for(let c of a.filter(a=>!a.dev))b[c.name]=c.version;return b}function f(a){let b={};for(let c of a.filter(a=>a.dev))b[c.name]=c.version;return b}c.d(b,{Nu:()=>e,YJ:()=>d,eh:()=>f})}};