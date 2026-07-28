/** Program 4500 — Application Factory types. */

export const APPLICATION_FACTORY_VERSION = "Program 4500";
export const APPLICATION_FACTORY_DISCLAIMER =
  "Application Factory — genera aplicaciones web completas (Next.js + Supabase) con preview navegable.";

export const APP_TECH_STACK = ["Next.js", "Supabase", "TypeScript", "Tailwind"] as const;
export type AppTechStack = (typeof APP_TECH_STACK)[number];

export type WizardStepId =
  | "prd"
  | "architecture"
  | "database"
  | "api"
  | "frontend"
  | "backend"
  | "auth"
  | "admin"
  | "permissions"
  | "tests"
  | "github"
  | "supabase"
  | "preview"
  | "deploy";

export type BuildStatus = "pending" | "running" | "success" | "failed" | "skipped" | "stub";

export interface WizardStep {
  id: WizardStepId;
  label: string;
  order: number;
  status: BuildStatus;
  summary?: string;
}

export interface PRD {
  title: string;
  description: string;
  audience: string;
  goals: string[];
  features: string[];
  userStories: string[];
  successMetrics: string[];
}

export interface ArchitectureLayer {
  name: string;
  technology: string;
  responsibility: string;
}

export interface Architecture {
  pattern: "monolith" | "modular-monolith" | "microservices-lite";
  layers: ArchitectureLayer[];
  deployment: string;
  dataFlow: string[];
  integrations: string[];
}

export interface DatabaseTable {
  name: string;
  description: string;
  columns: { name: string; type: string; nullable: boolean; primary?: boolean }[];
  rls: boolean;
}

export interface DatabaseSchema {
  provider: "supabase";
  tables: DatabaseTable[];
  migrations: string[];
  seedData: string[];
}

export interface APIRoute {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  auth: boolean;
  handler: string;
}

export interface APIRoutes {
  basePath: string;
  routes: APIRoute[];
  middleware: string[];
}

export interface FrontendPage {
  slug: string;
  title: string;
  route: string;
  component: string;
  requiresAuth: boolean;
  layout: "default" | "auth" | "admin";
}

export interface FrontendPages {
  framework: "nextjs";
  pages: FrontendPage[];
  components: string[];
  sharedLayout: string;
}

export interface BackendModule {
  name: string;
  path: string;
  description: string;
  services: string[];
}

export interface BackendModules {
  runtime: "nextjs-api" | "edge";
  modules: BackendModule[];
  middleware: string[];
}

export interface AuthConfig {
  provider: "supabase-auth";
  methods: ("email" | "oauth" | "magic-link")[];
  roles: string[];
  flows: { name: string; screens: string[] }[];
  sessionStrategy: "jwt" | "cookie";
}

export interface AdminPanel {
  sections: { id: string; title: string; route: string; permissions: string[] }[];
  widgets: string[];
  auditLog: boolean;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface Permissions {
  roles: Role[];
  permissions: Permission[];
  defaultRole: string;
}

export interface TestSuite {
  framework: "vitest" | "jest";
  unitTests: { file: string; description: string }[];
  integrationTests: { file: string; description: string }[];
  e2eTests: { file: string; description: string }[];
  coverageTarget: number;
}

export type BuildPhase =
  | "scaffold"
  | "database"
  | "api"
  | "frontend"
  | "auth"
  | "tests"
  | "github"
  | "supabase"
  | "preview"
  | "deploy";

export type BuildPhaseStatus = "idle" | "running" | "success" | "error" | "stub";

export interface BuildStatusEntry {
  phase: BuildPhase;
  label: string;
  status: BuildPhaseStatus;
  message: string;
  updatedAt: string;
}

export interface PipelineBuildStatus {
  projectId: string;
  entries: BuildStatusEntry[];
  overallPercent: number;
  deployUrl?: string;
  githubRepo?: string;
  supabaseProject?: string;
}

export interface PreviewPage {
  id: string;
  slug: string;
  title: string;
  layout: "default" | "auth" | "admin";
  content: PreviewSection[];
}

export interface PreviewSection {
  type: "hero" | "stats" | "table" | "form" | "list" | "card-grid";
  title?: string;
  data?: Record<string, unknown>;
}

export interface PreviewApp {
  appName: string;
  primaryColor: string;
  pages: PreviewPage[];
  navItems: { label: string; pageId: string; icon: string }[];
  authPages: string[];
  adminPages: string[];
  defaultPageId: string;
}

export interface ExportFileEntry {
  path: string;
  kind: "file" | "directory";
  description: string;
  contentPreview?: string;
}

export interface ExportBundle {
  projectId: string;
  projectName: string;
  framework: "nextjs";
  database: "supabase";
  files: ExportFileEntry[];
  manifestVersion: string;
  generatedAt: string;
}

export interface AppProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  currentStep: WizardStepId;
  steps: WizardStep[];
  prd: PRD | null;
  architecture: Architecture | null;
  database: DatabaseSchema | null;
  api: APIRoutes | null;
  frontend: FrontendPages | null;
  backend: BackendModules | null;
  auth: AuthConfig | null;
  admin: AdminPanel | null;
  permissions: Permissions | null;
  tests: TestSuite | null;
  preview: PreviewApp | null;
  buildStatus: PipelineBuildStatus;
  exportBundle: ExportBundle | null;
  completed: boolean;
}

export interface ApplicationFactorySnapshot {
  version: string;
  projects: AppProject[];
  activeProjectId: string | null;
  lastUpdated: string;
}

export interface PipelineRunResult {
  project: AppProject;
  stepCompleted: WizardStepId;
  nextStep: WizardStepId | null;
}
