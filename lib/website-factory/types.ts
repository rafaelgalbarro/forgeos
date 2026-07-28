/** PROGRAM 4400 — Website Factory types. */

export const WEBSITE_FACTORY_VERSION = "Program 4400";
export const WEBSITE_FACTORY_DISCLAIMER =
  "Website Factory — genera sitios web completos desde una idea con pipeline guiado.";

export type WizardStepId =
  | "idea"
  | "research"
  | "brand"
  | "copywriting"
  | "seo"
  | "page-architecture"
  | "components"
  | "nextjs"
  | "tailwind"
  | "shadcn"
  | "preview"
  | "github"
  | "deploy-preview";

export type WizardStepStatus = "pending" | "active" | "completed" | "blocked" | "skipped";

export interface WizardStep {
  id: WizardStepId;
  label: string;
  order: number;
  status: WizardStepStatus;
  summary: string;
  output?: Record<string, unknown>;
}

export type TemplateCategory = "landing" | "portfolio" | "saas" | "blog" | "ecommerce" | "docs";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  tags: string[];
  previewImage?: string;
  defaultPages: string[];
  suggestedComponents: string[];
}

export type BuildPhase =
  | "scaffold"
  | "styling"
  | "components"
  | "preview"
  | "github"
  | "deploy";

export type BuildPhaseStatus = "idle" | "running" | "success" | "error" | "stub";

export interface BuildStatusEntry {
  phase: BuildPhase;
  label: string;
  status: BuildPhaseStatus;
  message: string;
  updatedAt: string;
}

export interface BuildStatus {
  projectId: string;
  entries: BuildStatusEntry[];
  overallPercent: number;
  deployUrl?: string;
  githubRepo?: string;
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
  templateId: string;
  framework: "nextjs";
  files: ExportFileEntry[];
  manifestVersion: string;
  generatedAt: string;
}

export interface WebsiteIdea {
  title: string;
  description: string;
  audience: string;
  goals: string[];
}

export interface WebsiteBrand {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  tone: string;
  tagline: string;
}

export interface WebsitePage {
  slug: string;
  title: string;
  purpose: string;
  sections: string[];
}

export interface WebsiteProject {
  id: string;
  name: string;
  templateId: string;
  idea: WebsiteIdea;
  brand: WebsiteBrand;
  pages: WebsitePage[];
  copyBlocks: Record<string, string>;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  components: string[];
  currentStepId: WizardStepId;
  steps: WizardStep[];
  buildStatus: BuildStatus;
  exportBundle: ExportBundle | null;
  createdAt: string;
  updatedAt: string;
}

export interface WizardProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
  currentStepId: WizardStepId;
  currentStepLabel: string;
}

export interface PipelineRunResult {
  project: WebsiteProject;
  progress: WizardProgress;
  ranStepId: WizardStepId;
}
