export interface StackItem {
  layer: string;
  technology: string;
  rationale: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  phase: string;
  priority: "alta" | "media" | "baja";
}

export interface BuildPlan {
  ventureId: string;
  ventureName: string;
  technicalSummary: string;
  recommendedStack: StackItem[];
  technicalModules: string[];
  folderStructure: string[];
  mainEntities: string[];
  apis: ApiEndpoint[];
  frontendComponents: string[];
  screens: string[];
  suggestedDependencies: string[];
  technicalRisks: string[];
  implementationOrder: string[];
  mvpChecklist: ChecklistItem[];
  cursorPrompt: string;
  claudePrompt: string;
  generatedAt: string;
}

export interface BuildPlanInput {
  venture: import("@/lib/domain/venture").VentureProject;
}

export const PENDING = "Pendiente de completar";
