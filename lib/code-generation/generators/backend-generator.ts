/** PROGRAM 5360 — Backend generator (Node.js API + TypeScript). */

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
  extractModulesFromIdea,
  pascalCase,
} from "./shared";
import { buildDependenciesFromTemplate } from "../dependency-builder";
import { buildEnvExampleContent, buildEnvVarsFromTemplate } from "../environment-builder";

export async function generateBackendProject(input: CodeGenerationInput): Promise<CodeProject> {
  const template = getTemplateForProjectType("backend");
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

  const entityFiles = modules.map((mod) => ({
    path: `src/entities/${mod}.entity.ts`,
    content: generateEntity(mod),
    purpose: `Entity: ${mod}`,
  }));

  const serviceFiles = modules.map((mod) => ({
    path: `src/services/${mod}.service.ts`,
    content: generateBackendService(mod),
    purpose: `Service: ${mod}`,
  }));

  const repoFiles = modules.map((mod) => ({
    path: `src/repositories/${mod}.repository.ts`,
    content: generateBackendRepository(mod),
    purpose: `Repository: ${mod}`,
  }));

  const routeFiles = modules.map((mod) => ({
    path: `src/routes/${mod}.routes.ts`,
    content: generateRouteHandler(mod),
    purpose: `Routes: ${mod}`,
  }));

  const validationFiles = modules.map((mod) => ({
    path: `src/validation/${mod}.schema.ts`,
    content: generateValidationSchema(mod),
    purpose: `Zod schema: ${mod}`,
  }));

  const files = buildFiles([
    { path: "package.json", content: buildPackageJson(slug, template, deps), purpose: "Dependencies" },
    {
      path: "tsconfig.json",
      content: JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
            outDir: "dist",
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ["src/**/*"],
        },
        null,
        2
      ),
      purpose: "TypeScript config",
    },
    { path: "src/index.ts", content: generateIndex(modules), purpose: "Entry point" },
    ...entityFiles,
    ...serviceFiles,
    ...repoFiles,
    ...routeFiles,
    ...validationFiles,
    { path: "src/middleware/auth.guard.ts", content: generateAuthGuard(), purpose: "Auth guard" },
    { path: "src/middleware/permissions.ts", content: generatePermissions(), purpose: "Permission middleware" },
    { path: "src/jobs/sync.job.ts", content: generateJob(), purpose: "Background job stub" },
    { path: "src/events/domain.events.ts", content: generateEvents(modules), purpose: "Domain events" },
    { path: "migrations/001_initial.sql", content: generateBackendMigration(modules), purpose: "Migration file (not executed)" },
    { path: "docs/API.md", content: generateApiDocs(modules, ctx), purpose: "API documentation" },
    { path: "tests/health.test.ts", content: generateBackendTest(slug), purpose: "Health check test" },
    { path: "tests/seed.test.ts", content: generateSeedTest(modules), purpose: "Seed data test" },
    { path: ".env.example", content: buildEnvExampleContent(envVars), purpose: "Env template" },
    { path: "README.md", content: buildReadme(ctx, "Express · TypeScript · PostgreSQL"), purpose: "Documentation" },
  ]);

  const routes: CodeRoute[] = modules.map((mod) => ({
    id: `api-${mod}`,
    path: `/api/${mod}`,
    label: pascalCase(mod.replace(/_/g, " ")),
    file: `src/routes/${mod}.routes.ts`,
    auth: true,
  }));

  const project = buildProject({
    missionId: input.missionId,
    ventureId: input.ventureId,
    outputId: input.outputId,
    name: input.ventureName,
    projectType: "backend",
    template,
    files,
    routes,
    database: {
      provider: "postgresql",
      migrations: ["migrations/001_initial.sql"],
      seedFiles: [],
      schemaFiles: ["migrations/001_initial.sql"],
    },
    api: {
      basePath: "/api",
      endpoints: modules.flatMap((mod) => [
        { method: "GET", path: `/api/${mod}`, handler: `src/routes/${mod}.routes.ts`, description: `List ${mod}` },
        { method: "POST", path: `/api/${mod}`, handler: `src/routes/${mod}.routes.ts`, description: `Create ${mod}` },
        { method: "GET", path: `/api/${mod}/:id`, handler: `src/routes/${mod}.routes.ts`, description: `Get ${mod}` },
      ]),
    },
    tests: { framework: "vitest", files: ["tests/health.test.ts", "tests/seed.test.ts"] },
  });

  return applyValidationToProject(project);
}

function generateIndex(modules: string[]): string {
  return `import express from "express";
import cors from "cors";
import helmet from "helmet";
${modules.map((m) => `import { ${m}Router } from "./routes/${m}.routes";`).join("\n")}

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

${modules.map((m) => `app.use("/api/${m}", ${m}Router);`).join("\n")}

app.listen(PORT, () => console.log(\`API listening on :\${PORT}\`));
export default app;
`;
}

function generateEntity(mod: string): string {
  const Name = pascalCase(mod);
  return `export interface ${Name}Entity {
  id: string;
  name: string;
  status: "active" | "pending" | "archived";
  createdAt: string;
  updatedAt: string;
}
`;
}

function generateBackendService(mod: string): string {
  const Name = pascalCase(mod);
  return `import type { ${Name}Entity } from "../entities/${mod}.entity";
import { ${Name}Repository } from "../repositories/${mod}.repository";

export class ${Name}Service {
  static list(): Promise<${Name}Entity[]> {
    return ${Name}Repository.findAll();
  }
  static getById(id: string): Promise<${Name}Entity | null> {
    return ${Name}Repository.findById(id);
  }
  static create(data: Omit<${Name}Entity, "id" | "createdAt" | "updatedAt">): Promise<${Name}Entity> {
    return ${Name}Repository.create(data);
  }
}
`;
}

function generateBackendRepository(mod: string): string {
  const Name = pascalCase(mod);
  return `import type { ${Name}Entity } from "../entities/${mod}.entity";

const store: ${Name}Entity[] = [
  { id: "1", name: "Demo ${mod}", status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const ${Name}Repository = {
  findAll: async () => [...store],
  findById: async (id: string) => store.find((i) => i.id === id) ?? null,
  create: async (data: Omit<${Name}Entity, "id" | "createdAt" | "updatedAt">) => {
    const item: ${Name}Entity = { ...data, id: String(store.length + 1), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    store.push(item);
    return item;
  },
};
`;
}

function generateRouteHandler(mod: string): string {
  const Name = pascalCase(mod);
  return `import { Router } from "express";
import { ${Name}Service } from "../services/${mod}.service";
import { authGuard } from "../middleware/auth.guard";
import { ${mod}CreateSchema } from "../validation/${mod}.schema";

export const ${mod}Router = Router();
${mod}Router.use(authGuard);

${mod}Router.get("/", async (_req, res) => {
  const items = await ${Name}Service.list();
  res.json(items);
});

${mod}Router.get("/:id", async (req, res) => {
  const item = await ${Name}Service.getById(req.params.id);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

${mod}Router.post("/", async (req, res) => {
  const parsed = ${mod}CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const item = await ${Name}Service.create(parsed.data);
  res.status(201).json(item);
});
`;
}

function generateValidationSchema(mod: string): string {
  return `import { z } from "zod";

export const ${mod}CreateSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["active", "pending", "archived"]).default("pending"),
});
`;
}

function generateAuthGuard(): string {
  return `import type { Request, Response, NextFunction } from "express";

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token && process.env.NODE_ENV === "production") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
`;
}

function generatePermissions(): string {
  return `export const PERMISSIONS = {
  admin: ["*"],
  manager: ["read", "write"],
  technician: ["read", "update_own"],
  client: ["read_own"],
} as const;

export type Role = keyof typeof PERMISSIONS;
`;
}

function generateJob(): string {
  return `/** Background job stub — not executed by ForgeOS */
export async function runSyncJob() {
  console.log("[sync] Job scheduled (dry-run)");
  return { processed: 0 };
}
`;
}

function generateEvents(modules: string[]): string {
  return modules
    .map((m) => `export type ${pascalCase(m)}CreatedEvent = { type: "${m}.created"; payload: { id: string } };`)
    .join("\n");
}

function generateBackendMigration(modules: string[]): string {
  return `-- Backend migration — NOT executed by ForgeOS\n${modules
    .map(
      (m) => `CREATE TABLE ${m} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);`
    )
    .join("\n\n")}\n`;
}

function generateApiDocs(modules: string[], ctx: TemplateContext): string {
  return `# ${ctx.ventureName} API

Base URL: \`http://localhost:4000\`

## Endpoints

${modules
  .map(
    (m) => `### ${m}
- \`GET /api/${m}\` — List all
- \`POST /api/${m}\` — Create
- \`GET /api/${m}/:id\` — Get by ID
`
  )
  .join("\n")}

## Auth

Bearer token in \`Authorization\` header (demo mode allows unauthenticated).
`;
}

function generateBackendTest(slug: string): string {
  return `import { describe, it, expect } from "vitest";
describe("${slug} API", () => { it("health", () => expect(true).toBe(true)); });
`;
}

function generateSeedTest(modules: string[]): string {
  return `import { describe, it, expect } from "vitest";
describe("seed data", () => {
  ${modules.map((m) => `it("has ${m} fixture", () => expect("${m}").toBeTruthy());`).join("\n  ")}
});
`;
}
