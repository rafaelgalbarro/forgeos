export type BrainWorkerId = "research" | "product" | "founder" | "ceo";

export interface BrainContextSection {
  id: string;
  title: string;
  content: string;
}

export interface BrainContextBundle {
  version: string;
  sections: BrainContextSection[];
}
