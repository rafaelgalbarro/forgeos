export interface ForgeDecision {
  id: string;
  ventureId: string;
  workerId: string;
  title: string;
  rationale: string;
  timestamp: string;
}

export interface ForgePattern {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
}

export interface ForgePromptRecord {
  id: string;
  ventureId: string;
  workerId: string;
  templateId: string;
  prompt: string;
  timestamp: string;
}

export interface ForgeArchitectureRecord {
  id: string;
  ventureId: string;
  stack: string[];
  summary: string;
  timestamp: string;
}

export interface ForgeLesson {
  id: string;
  ventureId: string;
  title: string;
  insight: string;
  source: "heuristic" | "worker" | "user";
  timestamp: string;
}

export interface ForgeProjectDNA {
  ventureId: string;
  projectName: string;
  ideaText: string;
  decisions: ForgeDecision[];
  architecture: ForgeArchitectureRecord | null;
  prompts: ForgePromptRecord[];
  workersExecuted: string[];
  results: Record<string, unknown>;
  lessons: ForgeLesson[];
  createdAt: string;
  updatedAt: string;
}

export interface DNAStore {
  get(ventureId: string): ForgeProjectDNA | null;
  save(record: ForgeProjectDNA): void;
  list(): ForgeProjectDNA[];
}
