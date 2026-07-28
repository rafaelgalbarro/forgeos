/** ForgeOS RC6.5 — Autonomous Executive Organization types. */

export type DepartmentId =
  | "ceo"
  | "research"
  | "product"
  | "marketing"
  | "qa"
  | "build"
  | "architecture"
  | "growth"
  | "capital"
  | "legal"
  | "security"
  | "support";

export type PriorityLevel = "critical" | "high" | "medium" | "low";
export type RiskSeverity = "critical" | "high" | "medium" | "low";
export type InitiativeStatus = "active" | "blocked" | "completed" | "planned";
export type BriefingDecision = "pending" | "accepted" | "modified" | "rejected";

export interface DepartmentObjective {
  id: string;
  departmentId: DepartmentId;
  title: string;
  progress: number;
  dueDate: string;
  owner: string;
}

export interface DepartmentKpi {
  id: string;
  departmentId: DepartmentId;
  label: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  target: number;
}

export interface DepartmentWorkload {
  departmentId: DepartmentId;
  label: string;
  loadPercent: number;
  capacityPercent: number;
  activeTasks: number;
}

export interface DetectedRisk {
  id: string;
  departmentId: DepartmentId;
  title: string;
  severity: RiskSeverity;
  detectedAt: string;
  mitigation?: string;
}

export interface ExecutivePriority {
  id: string;
  rank: number;
  title: string;
  rationale: string;
  departmentId: DepartmentId;
  level: PriorityLevel;
}

export interface ActiveInitiative {
  id: string;
  title: string;
  departmentIds: DepartmentId[];
  status: InitiativeStatus;
  progress: number;
  owner: string;
}

export interface OvernightInsight {
  id: string;
  departmentId: DepartmentId;
  message: string;
  timestamp: string;
}

export interface ExecutiveDailyBriefing {
  id: string;
  founderName: string;
  generatedAt: string;
  greeting: string;
  overnightInsights: OvernightInsight[];
  priorities: ExecutivePriority[];
  risks: DetectedRisk[];
  initiatives: ActiveInitiative[];
  workload: DepartmentWorkload[];
  healthScore: number;
  decision: BriefingDecision;
  recommendation: string;
}

export interface WeeklyBoardMeeting {
  id: string;
  scheduledAt: string;
  agenda: string[];
  attendees: DepartmentId[];
  status: "scheduled" | "in-progress" | "completed";
}

export interface ExecutiveInboxItem {
  id: string;
  from: DepartmentId;
  subject: string;
  preview: string;
  priority: PriorityLevel;
  receivedAt: string;
  read: boolean;
}

export interface ExecutiveNotification {
  id: string;
  title: string;
  body: string;
  departmentId: DepartmentId;
  createdAt: string;
  read: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  departmentId?: DepartmentId;
  type: "meeting" | "deadline" | "review" | "briefing";
}

export interface OrganizationSnapshot {
  briefing: ExecutiveDailyBriefing;
  boardMeeting: WeeklyBoardMeeting;
  objectives: DepartmentObjective[];
  kpis: DepartmentKpi[];
  inbox: ExecutiveInboxItem[];
  notifications: ExecutiveNotification[];
  calendar: CalendarEvent[];
  healthScore: number;
  healthFactors: { label: string; score: number }[];
}
