export type BuildQueueState =
  | "Pending"
  | "Planning"
  | "Building"
  | "Testing"
  | "Deploying"
  | "Live";

export type ArtifactType =
  | "Backend"
  | "Frontend"
  | "Architecture"
  | "Database"
  | "API"
  | "CI/CD"
  | "Testing"
  | "Deployment"
  | "Documentation";

export type PromptTarget = "Cursor" | "Claude" | "Codex" | "GitHub Copilot" | "Replit";

export interface BuildArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  description: string;
  status: "draft" | "ready" | "generated";
}

export interface BuildQueueItem {
  id: string;
  ventureId: string;
  ventureName: string;
  state: BuildQueueState;
  progress: number;
  currentPhase: string;
  artifacts: BuildArtifact[];
  startedAt: string | null;
  updatedAt: string;
}

export interface BuildTimelineEvent {
  id: string;
  ventureId: string;
  label: string;
  state: BuildQueueState;
  timestamp: string;
}

export interface BuildPrompt {
  target: PromptTarget;
  title: string;
  content: string;
}

export interface ConnectorStub {
  id: string;
  name: string;
  status: "stub";
  description: string;
}

export interface BuildEngineOutput {
  queue: BuildQueueItem[];
  timeline: BuildTimelineEvent[];
  prompts: BuildPrompt[];
  connectors: ConnectorStub[];
  computedAt: string;
}
