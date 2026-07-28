/** Program 4500 — ForgeOS Command Center types. */

export const COMMAND_CENTER_VERSION = "Program 4500";

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

export interface CeoPanelData {
  greeting: string;
  executiveSummary: string;
  dailyGoals: string[];
  risks: string[];
  recommendations: string[];
  suggestedActions: string[];
  confidenceScore: number;
  ctaLabel: string;
  ctaHref: string;
}

export interface VenturePanelItem {
  id: string;
  name: string;
  healthScore: number;
  healthLabel: string;
  readinessLabel: string;
  ventureScore: string;
  lastActivity: string;
  buildStatus: string;
  deployStatus: string;
  href: string;
}

export interface VenturePanelData {
  ventures: VenturePanelItem[];
  emptyMessage: string;
}

export interface AiProviderRow {
  id: string;
  label: string;
  healthy: boolean;
  latencyMs: number;
  costPer1k: number;
  streaming: boolean;
  fallbacks: number;
  model: string;
}

export interface AiPanelData {
  mode: "mock" | "real";
  mockWarning: string | null;
  providers: AiProviderRow[];
  avgLatencyMs: number;
  totalCost: number;
  streamingEnabled: boolean;
  href: string;
}

export interface SelfEvolutionPanelData {
  improvementsDetected: number;
  proposals: { id: string; title: string; roi: string; risk: string; status: string }[];
  aggregateRoi: number;
  aggregateRisk: string;
  healthScore: number;
  href: string;
}

export interface BuildPanelData {
  lastBuildLabel: string;
  deployPreview: string;
  rollbackReady: boolean;
  approvalRequired: boolean;
  mode: string;
  href: string;
}

export interface MeshStatusPanel {
  departmentsActive: number;
  departmentsTotal: number;
  lastTopic: string;
  status: "healthy" | "attention" | "idle";
  href: string;
}

export interface RuntimeHealthPanel {
  score: number;
  label: string;
  venturesHealthy: number;
  venturesTotal: number;
}

export interface TaskItem {
  id: string;
  label: string;
  priority: string;
  href: string;
}

export interface TimelineItem {
  id: string;
  label: string;
  ventureName?: string;
  relative: string;
  href?: string;
}

export interface MarketplacePanelData {
  totalPacks: number;
  featured: number;
  summary: string;
  href: string;
}

export interface OrganizationPanelData {
  healthScore: number;
  initiatives: number;
  departments: number;
  href: string;
}

export interface CapitalPanelData {
  metrics: { label: string; value: string }[];
  href: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  relative: string;
}

export interface DecisionItem {
  id: string;
  label: string;
  department: string;
  relative: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  time: string;
}

export interface CommandCenterSnapshot {
  version: string;
  founderName: string;
  generatedAt: string;
  ceo: CeoPanelData;
  priorities: TaskItem[];
  ventures: VenturePanelData;
  mesh: MeshStatusPanel;
  ai: AiPanelData;
  runtime: RuntimeHealthPanel;
  tasks: TaskItem[];
  timeline: TimelineItem[];
  build: BuildPanelData;
  deployments: { label: string; status: string; href: string }[];
  organization: OrganizationPanelData;
  marketplace: MarketplacePanelData;
  capital: CapitalPanelData;
  notifications: NotificationItem[];
  selfEvolution: SelfEvolutionPanelData;
  decisions: DecisionItem[];
  calendar: CalendarItem[];
  quickActions: QuickAction[];
}
