"use strict";exports.id=723,exports.ids=[723],exports.modules={12287:(a,b,c)=>{function d(a){return a.envVars.map(a=>({key:a.key,description:a.description,example:a.example,required:a.required,secret:a.secret}))}function e(a){return a.map(a=>{let b=`# ${a.description}${a.required?" (required)":""}`;return`${b}
${a.key}=${a.example}`}).join("\n\n")+"\n"}c.d(b,{a:()=>d,r:()=>e})},19394:(a,b,c)=>{c.d(b,{C:()=>e});var d=c(80083);function e(a){return a.map(a=>(0,d.ui)(a.path,a.content,a.purpose,{generatedBy:a.generatedBy,sourceArtifactIds:a.sourceArtifactIds}))}},20723:(a,b,c)=>{c.d(b,{generateBackendProject:()=>l});var d=c(19394),e=c(48876),f=c(44887),g=c(30880),h=c(80083),i=c(62074),j=c(70045),k=c(12287);async function l(a){var b,c,l,m,n,o;let p=(0,f.nx)("backend"),q=(0,h.Yv)(a.ventureName),r=a.modules??(0,i.I$)(a.ideaText),s={name:a.ventureName,slug:q,ventureName:a.ventureName,ideaText:a.ideaText,modules:r,sourceArtifactIds:a.sourceArtifactIds??[]},t=(0,j.YJ)(p),u=(0,k.a)(p),v=r.map(a=>({path:`src/entities/${a}.entity.ts`,content:function(a){let b=(0,i.fL)(a);return`export interface ${b}Entity {
  id: string;
  name: string;
  status: "active" | "pending" | "archived";
  createdAt: string;
  updatedAt: string;
}
`}(a),purpose:`Entity: ${a}`})),w=r.map(a=>({path:`src/services/${a}.service.ts`,content:function(a){let b=(0,i.fL)(a);return`import type { ${b}Entity } from "../entities/${a}.entity";
import { ${b}Repository } from "../repositories/${a}.repository";

export class ${b}Service {
  static list(): Promise<${b}Entity[]> {
    return ${b}Repository.findAll();
  }
  static getById(id: string): Promise<${b}Entity | null> {
    return ${b}Repository.findById(id);
  }
  static create(data: Omit<${b}Entity, "id" | "createdAt" | "updatedAt">): Promise<${b}Entity> {
    return ${b}Repository.create(data);
  }
}
`}(a),purpose:`Service: ${a}`})),x=r.map(a=>({path:`src/repositories/${a}.repository.ts`,content:function(a){let b=(0,i.fL)(a);return`import type { ${b}Entity } from "../entities/${a}.entity";

const store: ${b}Entity[] = [
  { id: "1", name: "Demo ${a}", status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const ${b}Repository = {
  findAll: async () => [...store],
  findById: async (id: string) => store.find((i) => i.id === id) ?? null,
  create: async (data: Omit<${b}Entity, "id" | "createdAt" | "updatedAt">) => {
    const item: ${b}Entity = { ...data, id: String(store.length + 1), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    store.push(item);
    return item;
  },
};
`}(a),purpose:`Repository: ${a}`})),y=r.map(a=>({path:`src/routes/${a}.routes.ts`,content:function(a){let b=(0,i.fL)(a);return`import { Router } from "express";
import { ${b}Service } from "../services/${a}.service";
import { authGuard } from "../middleware/auth.guard";
import { ${a}CreateSchema } from "../validation/${a}.schema";

export const ${a}Router = Router();
${a}Router.use(authGuard);

${a}Router.get("/", async (_req, res) => {
  const items = await ${b}Service.list();
  res.json(items);
});

${a}Router.get("/:id", async (req, res) => {
  const item = await ${b}Service.getById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

${a}Router.post("/", async (req, res) => {
  const parsed = ${a}CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const item = await ${b}Service.create(parsed.data);
  res.status(201).json(item);
});
`}(a),purpose:`Routes: ${a}`})),z=r.map(a=>{var b;return{path:`src/validation/${a}.schema.ts`,content:(b=a,`import { z } from "zod";

export const ${b}CreateSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "pending", "archived"]).default("pending"),
});
`),purpose:`Zod schema: ${a}`}}),A=(0,d.C)([{path:"package.json",content:(0,i.Jh)(q,p,t),purpose:"Dependencies"},{path:"tsconfig.json",content:JSON.stringify({compilerOptions:{target:"ES2020",module:"commonjs",strict:!0,outDir:"dist",esModuleInterop:!0,skipLibCheck:!0},include:["src/**/*"]},null,2),purpose:"TypeScript config"},{path:"src/index.ts",content:(b=r,`import express from "express";
import cors from "cors";
import helmet from "helmet";
${b.map(a=>`import { ${a}Router } from "./routes/${a}.routes";`).join("\n")}

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

${b.map(a=>`app.use("/api/${a}", ${a}Router);`).join("\n")}

app.listen(PORT, () => console.log(\`API listening on :\${PORT}\`));
export default app;
`),purpose:"Entry point"},...v,...w,...x,...y,...z,{path:"src/middleware/auth.guard.ts",content:`import type { Request, Response, NextFunction } from "express";

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token && process.env.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
`,purpose:"Auth guard"},{path:"src/middleware/permissions.ts",content:`export const PERMISSIONS = {
  admin: ["*"],
  manager: ["read", "write"],
  technician: ["read", "update_own"],
  client: ["read_own"],
} as const;

export type Role = keyof typeof PERMISSIONS;
`,purpose:"Permission middleware"},{path:"src/jobs/sync.job.ts",content:`/** Background job stub — not executed by ForgeOS */
export async function runSyncJob() {
  console.log("[sync] Job scheduled (dry-run)");
  return { processed: 0 };
}
`,purpose:"Background job stub"},{path:"src/events/domain.events.ts",content:r.map(a=>`export type ${(0,i.fL)(a)}CreatedEvent = { type: "${a}.created"; payload: { id: string } };`).join("\n"),purpose:"Domain events"},{path:"migrations/001_initial.sql",content:(c=r,`-- Backend migration — NOT executed by ForgeOS
${c.map(a=>`CREATE TABLE ${a} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`).join("\n\n")}
`),purpose:"Migration file (not executed)"},{path:"docs/API.md",content:(l=r,m=s,`# ${m.ventureName} API

Base URL: \`http://localhost:4000\`

## Endpoints

${l.map(a=>`### ${a}
- \`GET /api/${a}\` — List all
- \`POST /api/${a}\` — Create
- \`GET /api/${a}/:id\` — Get by ID
`).join("\n")}

## Auth

Bearer token in \`Authorization\` header (demo mode allows unauthenticated).
`),purpose:"API documentation"},{path:"tests/health.test.ts",content:(n=q,`import { describe, it, expect } from "vitest";
describe("${n} API", () => { it("health", () => expect(true).toBe(true)); });
`),purpose:"Health check test"},{path:"tests/seed.test.ts",content:(o=r,`import { describe, it, expect } from "vitest";
describe("seed data", () => {
  ${o.map(a=>`it("has ${a} fixture", () => expect("${a}").toBeTruthy());`).join("\n  ")}
});
`),purpose:"Seed data test"},{path:".env.example",content:(0,k.r)(u),purpose:"Env template"},{path:"README.md",content:(0,i.pw)(s,"Express \xb7 TypeScript \xb7 PostgreSQL"),purpose:"Documentation"}]),B=r.map(a=>({id:`api-${a}`,path:`/api/${a}`,label:(0,i.fL)(a.replace(/_/g," ")),file:`src/routes/${a}.routes.ts`,auth:!0})),C=(0,e.a)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,name:a.ventureName,projectType:"backend",template:p,files:A,routes:B,database:{provider:"postgresql",migrations:["migrations/001_initial.sql"],seedFiles:[],schemaFiles:["migrations/001_initial.sql"]},api:{basePath:"/api",endpoints:r.flatMap(a=>[{method:"GET",path:`/api/${a}`,handler:`src/routes/${a}.routes.ts`,description:`List ${a}`},{method:"POST",path:`/api/${a}`,handler:`src/routes/${a}.routes.ts`,description:`Create ${a}`},{method:"GET",path:`/api/${a}/:id`,handler:`src/routes/${a}.routes.ts`,description:`Get ${a}`}])},tests:{framework:"vitest",files:["tests/health.test.ts","tests/seed.test.ts"]}});return(0,g.A)(C)}},48876:(a,b,c)=>{c.d(b,{a:()=>h});var d=c(50943),e=c(80083),f=c(70045),g=c(12287);function h(a){let b=new Date().toISOString(),c=(0,e.G0)({missionId:a.missionId,ventureId:a.ventureId,outputId:a.outputId,projectType:a.projectType,name:a.name,templateId:a.template.id,framework:a.template.stack.framework,language:a.template.stack.language}),h=(0,g.a)(a.template),i=a.files.find(a=>"README.md"===a.path)?.content??"",j=a.files.find(a=>".env.example"===a.path)?.content??(0,g.r)(h),k={...c,files:a.files,directories:(0,e.b$)(a.files),dependencies:(0,f.YJ)(a.template),scripts:Object.entries(a.template.scripts).map(([a,b])=>({name:a,command:b,purpose:`Script: ${a}`})),environmentVariables:h,routes:a.routes??[],database:a.database,api:a.api,tests:a.tests,documentation:{readme:i,envExample:j},warnings:a.warnings??[],status:"GENERATED",generationMode:a.generationMode??"template",generatedAt:b,updatedAt:b};return{...k,manifest:(0,d.zF)(k)}}},50943:(a,b,c)=>{function d(a){let b={},c={};for(let d of a.dependencies)d.dev?c[d.name]=d.version:b[d.name]=d.version;let d={};for(let b of a.scripts)"dev"===b.name?d.dev=b.command:"build"===b.name?d.build=b.command:"start"===b.name?d.start=b.command:"test"===b.name&&(d.test=b.command);return d.install="npm install",{projectId:a.projectId,missionId:a.missionId,outputId:a.outputId,kind:({website:"website",web_application:"webapp",mobile:"mobile",backend:"backend",fullstack:"webapp"})[a.projectType],framework:a.framework,name:a.name,version:a.version,scripts:d,envVars:a.environmentVariables.map(a=>({key:a.key,value:a.example,source:"manifest",sensitive:a.secret})),routes:a.routes.map(a=>({path:a.path,label:a.label})),dependencies:b,devDependencies:Object.keys(c).length>0?c:void 0,declaredTests:a.tests?.files,generatedAt:a.generatedAt??a.updatedAt}}function e(a){return{...a,manifest:d(a)}}c.d(b,{dD:()=>e,zF:()=>d})},62074:(a,b,c)=>{c.d(b,{I$:()=>e,Jh:()=>f,cZ:()=>g,fL:()=>i,pw:()=>h,xT:()=>j});var d=c(70045);function e(a){let b=a.toLowerCase(),c=[];for(let[a,d]of Object.entries({technicians:["t\xe9cnico","technician","campo","field"],clients:["cliente","client","customer"],work_orders:["incidencia","orden","work order","ticket","servicio"],routes:["ruta","route","dispatch"],inventory:["inventario","inventory","stock","almac\xe9n"],billing:["factura","billing","invoice","cobro"],dashboard:["dashboard","panel","m\xe9trica"],auth:["auth","login","usuario","rol"]}))d.some(a=>b.includes(a))&&c.push(a);return 0===c.length&&c.push("dashboard","auth"),c}function f(a,b,c){return JSON.stringify({name:a,version:"0.1.0",private:!0,scripts:b.scripts,dependencies:(0,d.Nu)(c),devDependencies:(0,d.eh)(c)},null,2)}function g(){return JSON.stringify({compilerOptions:{target:"ES2017",lib:["dom","dom.iterable","esnext"],allowJs:!0,skipLibCheck:!0,strict:!0,noEmit:!0,esModuleInterop:!0,module:"esnext",moduleResolution:"bundler",resolveJsonModule:!0,isolatedModules:!0,jsx:"preserve",incremental:!0,paths:{"@/*":["./*"]}},include:["**/*.ts","**/*.tsx"],exclude:["node_modules"]},null,2)}function h(a,b){return`# ${a.ventureName}

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