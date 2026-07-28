import type { PortfolioHighlights } from "@/lib/ceo-office/portfolio-ranking";

export type CeoWorkspaceSource = "ai" | "heuristic" | "mock";

export interface AgendaItem {
  id: string;
  timeLabel: string;
  title: string;
  description: string;
  priority: "alta" | "media" | "baja";
  href?: string;
  ventureName?: string;
}

export interface PriorityItem {
  id: string;
  label: string;
  rationale: string;
  ventureName?: string;
  href?: string;
}

export interface RiskItem {
  id: string;
  label: string;
  severity: "critical" | "high" | "medium";
  ventureName?: string;
}

export interface OpportunityItem {
  id: string;
  label: string;
  impact: string;
  ventureName?: string;
}

export interface RecommendationItem {
  id: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  href?: string;
}

export interface NextDecisionItem {
  id: string;
  decision: string;
  context: string;
  ventureName?: string;
  href?: string;
  priority: "alta" | "media" | "baja";
}

export interface PortfolioVentureRow {
  id: string;
  name: string;
  statusLabel: string;
  nextAction: string;
  href: string;
  riskLevel: number;
}

export interface PortfolioSnapshot {
  ventureCount: number;
  activeCount: number;
  priorityActionCount: number;
  topVenture: { name: string; href: string } | null;
  criticalVenture: { name: string; href: string } | null;
  promisingVenture: { name: string; href: string } | null;
  ventures: PortfolioVentureRow[];
  highlights: PortfolioHighlights;
}

export interface CeoDirectorNarrative {
  greeting: string;
  absenceSummary: string;
  prioritiesLead: string;
  fullMessage: string;
}

export interface CeoWorkspaceData {
  source: CeoWorkspaceSource;
  generatedAt: string;
  focusVentureId: string | null;
  focusVentureName: string | null;
  provider?: string;
  model?: string;
  fallbackUsed: boolean;
  warnings: string[];
  narrative: CeoDirectorNarrative;
  executiveBrief: string;
  priorities: PriorityItem[];
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  recommendations: RecommendationItem[];
  nextDecisions: NextDecisionItem[];
  portfolio: PortfolioSnapshot;
  agenda: AgendaItem[];
  consensusLevel?: string;
  consensusDecision?: string;
  confidence?: number;
  timeHorizon?: string;
}
