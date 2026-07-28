export type VentureHealthCategory =
  | "healthy"
  | "at-risk"
  | "blocked"
  | "operating"
  | "scaling";

export interface VentureHealthItem {
  ventureId: string;
  ventureName: string;
  category: VentureHealthCategory;
  categoryLabel: string;
  reason: string;
}

export interface PortfolioHealthSnapshot {
  healthy: number;
  atRisk: number;
  blocked: number;
  operating: number;
  scaling: number;
  items: VentureHealthItem[];
}
