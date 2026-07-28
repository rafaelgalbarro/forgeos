import type { BuildContext } from "@/lib/build-platform/build-context/types";

export type FrontendPlanStatus = "draft" | "ready";
export type SurfaceType = "app" | "dashboard" | "form" | "widget";

export interface FrontendFactoryInput {
  context: BuildContext;
  dna: BuildDna;
  registry: BuildRegistry;
}

export interface FrontendBlueprintMeta {
  ventureId: string;
  ventureName: string;
  generatedAt: string;
  version: string;
  status: FrontendPlanStatus;
}

export interface AppStructureNode {
  id: string;
  label: string;
  path: string;
  kind: "folder" | "file" | "group";
  children?: AppStructureNode[];
}

export interface RouteSpec {
  id: string;
  path: string;
  pageId: string;
  layoutId: string;
  surface: SurfaceType;
  auth: "public" | "protected";
}

export interface LayoutSpec {
  id: string;
  name: string;
  shell: "public" | "workspace" | "dashboard";
  regions: string[];
}

export interface ComponentSpec {
  id: string;
  name: string;
  fhisComponent: string;
  variant?: string;
  props: Record<string, string | number | boolean>;
  rationale: string;
}

export interface PageSpec {
  id: string;
  title: string;
  routePath: string;
  purpose: string;
  layoutId: string;
  components: string[];
  dataDependencies: string[];
}

export interface NavigationItemSpec {
  id: string;
  label: string;
  routePath: string;
  icon: string;
  visibility: "public" | "workspace" | "dashboard";
}

export interface FormFieldSpec {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "switch";
  required: boolean;
  sourceSection?: string;
}

export interface FormSpec {
  id: string;
  title: string;
  submitIntent: string;
  fields: FormFieldSpec[];
  components: string[];
}

export interface DashboardWidgetRef {
  widgetId: string;
  position: "hero" | "row-1" | "row-2";
}

export interface DashboardSpec {
  id: string;
  title: string;
  audience: "founder" | "operator" | "team";
  widgets: DashboardWidgetRef[];
}

export interface WidgetSpec {
  id: string;
  title: string;
  kind: "kpi" | "timeline" | "status" | "list";
  source: string;
  fhisComponent: string;
}

export interface FrontendBlueprintValidationIssue {
  code: string;
  message: string;
  severity: "warning" | "error";
}

export interface FrontendBlueprintValidation {
  valid: boolean;
  issues: FrontendBlueprintValidationIssue[];
}

export interface FrontendBlueprint {
  meta: FrontendBlueprintMeta;
  appStructure: AppStructureNode[];
  routes: RouteSpec[];
  layouts: LayoutSpec[];
  components: ComponentSpec[];
  pages: PageSpec[];
  navigation: NavigationItemSpec[];
  forms: FormSpec[];
  dashboards: DashboardSpec[];
  widgets: WidgetSpec[];
  validation: FrontendBlueprintValidation;
}

export interface BuildDna {
  productType: string;
  primaryPersona: string;
  uiTone: "formal" | "neutral" | "friendly";
  complexity: "low" | "medium" | "high";
  preferredNavigation: "sidebar" | "topbar";
  modules: string[];
}

export interface BuildRegistryEntry {
  id: string;
  name: string;
  category: "page" | "form" | "dashboard" | "widget";
  tags: string[];
}

export interface BuildRegistry {
  entries: BuildRegistryEntry[];
  preferredWidgets: string[];
  requiredRoutes: string[];
}
