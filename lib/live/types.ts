export type LiveDepartment =
  | "ceo"
  | "research"
  | "product"
  | "marketing"
  | "simulator"
  | "cto"
  | "ux"
  | "discovery";

export interface LiveTimelineEvent {
  id: string;
  time: string;
  department: LiveDepartment;
  departmentLabel: string;
  message: string;
  ventureId?: string;
  ventureName?: string;
}

export interface AbsenceSummaryLine {
  id: string;
  text: string;
}

export interface VentureLivePulse {
  id: string;
  label: string;
  department: LiveDepartment;
}

export interface LiveActivitySnapshot {
  timeline: LiveTimelineEvent[];
  absenceSummary: AbsenceSummaryLine[];
  venturePulses: Record<string, VentureLivePulse[]>;
}
