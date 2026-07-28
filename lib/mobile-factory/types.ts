/** Program 4600 — Mobile Factory types. */

export const MOBILE_FACTORY_VERSION = "Program 4600";
export const MOBILE_FACTORY_DISCLAIMER =
  "Mobile Factory — scaffold Expo/React Native con preview y builds simulados (sin dispositivo real).";

export const MOBILE_TECH_STACK = ["React Native", "Expo", "Android", "iOS"] as const;
export type MobileTechStack = (typeof MOBILE_TECH_STACK)[number];

export type WizardStepId =
  | "idea"
  | "template"
  | "navigation"
  | "screens"
  | "auth"
  | "api"
  | "structure"
  | "preview"
  | "android"
  | "ios"
  | "complete";

export type BuildStatus = "pending" | "running" | "success" | "failed" | "skipped";

export interface WizardStep {
  id: WizardStepId;
  label: string;
  order: number;
  status: BuildStatus;
  summary?: string;
}

export type TemplateCategory =
  | "consumer"
  | "saas"
  | "marketplace"
  | "social"
  | "utility"
  | "fitness"
  | "fintech";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  techStack: MobileTechStack[];
  defaultScreens: string[];
  defaultNav: "tabs" | "stack" | "drawer";
  features: string[];
}

export interface NavRoute {
  name: string;
  title: string;
  icon?: string;
  screen: string;
}

export interface NavigationStructure {
  type: "tabs" | "stack" | "drawer";
  root: string;
  routes: NavRoute[];
  authGuarded: boolean;
}

export interface ScreenDefinition {
  id: string;
  name: string;
  title: string;
  route: string;
  component: string;
  requiresAuth: boolean;
  description: string;
}

export interface AuthFlowScaffold {
  provider: "email" | "oauth" | "magic-link" | "biometric";
  screens: string[];
  tokenStorage: "secure-store" | "async-storage";
  refreshStrategy: "jwt-refresh" | "session-cookie";
  endpoints: { login: string; register: string; logout: string; refresh: string };
}

export interface ApiIntegrationScaffold {
  baseUrl: string;
  clientFile: string;
  authHeader: string;
  endpoints: { method: string; path: string; description: string }[];
  errorHandling: string[];
}

export interface ProjectFile {
  path: string;
  kind: "source" | "config" | "asset" | "test";
  description: string;
}

export interface ProjectStructureManifest {
  framework: "expo";
  entryPoint: string;
  files: ProjectFile[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface ExpoPreview {
  projectSlug: string;
  previewUrl: string;
  qrCodeData: string;
  expoGoUrl: string;
  status: BuildStatus;
  lastUpdated: string | null;
}

export interface PlatformBuild {
  platform: "android" | "ios";
  status: BuildStatus;
  buildId: string | null;
  artifactUrl: string | null;
  version: string;
  startedAt: string | null;
  completedAt: string | null;
  logs: string[];
  stub: boolean;
}

export interface MobileProject {
  id: string;
  name: string;
  idea: string;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
  currentStep: WizardStepId;
  steps: WizardStep[];
  navigation: NavigationStructure | null;
  screens: ScreenDefinition[];
  auth: AuthFlowScaffold | null;
  api: ApiIntegrationScaffold | null;
  structure: ProjectStructureManifest | null;
  preview: ExpoPreview | null;
  androidBuild: PlatformBuild | null;
  iosBuild: PlatformBuild | null;
  completed: boolean;
}

export interface MobileFactorySnapshot {
  version: string;
  projects: MobileProject[];
  activeProjectId: string | null;
  lastUpdated: string;
}

export interface PipelineRunResult {
  project: MobileProject;
  stepCompleted: WizardStepId;
  nextStep: WizardStepId | null;
}
