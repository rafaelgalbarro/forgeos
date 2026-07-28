export type ProjectDeliverableId =
  | "prd"
  | "roadmap"
  | "wireframes"
  | "architecture"
  | "sql"
  | "backend"
  | "frontend"
  | "landing"
  | "kpis"
  | "pricing";

export interface ProjectDeliverable {
  id: ProjectDeliverableId;
  title: string;
  format: "markdown" | "code" | "html";
  content: string;
  source: "mock" | "ai" | "heuristic";
}

export interface ProjectDocument {
  id: string;
  title: string;
  deliverables: ProjectDeliverable[];
}

export interface ProjectBundle {
  ventureId: string;
  projectName: string;
  documents: ProjectDocument[];
  generatedAt: string;
}
