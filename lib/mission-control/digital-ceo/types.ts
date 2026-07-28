/** PROGRAM 6000 — Digital CEO brief types (coordinator only). */

import type { MissionPhase } from "../types";

export const DIGITAL_CEO_VERSION = "PROGRAM 6000 — DIGITAL CEO" as const;
export const DIGITAL_CEO_STORAGE_PREFIX = "forgeos-digital-ceo-" as const;

export interface MorningBrief {
  greeting: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  headline: string;
  keyItems: string[];
  pendingDecisionCount: number;
  riskCount: number;
  generatedAt: string;
}

export interface MissionBrief {
  missionId: string;
  title: string;
  phase: MissionPhase;
  phaseLabel: string;
  intention: string | null;
  progressPercent: number;
  activeDomains: string[];
  statusSummary: string;
  generatedAt: string;
}

export interface CEOBrief {
  strategicPerspective: string;
  confidence: number;
  confidenceLabel: string;
  topRisk: string | null;
  topPriority: string | null;
  pendingDecisionsReminder: string | null;
  generatedAt: string;
}

export interface DailyPriority {
  rank: number;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  source: "decision-center" | "mission-queue" | "risk" | "timeline";
  linkedId?: string;
}

export interface WeeklyReview {
  weekStart: string;
  weekEnd: string;
  progressDelta: number;
  wins: string[];
  blockers: string[];
  eventsCount: number;
  phaseAtWeekStart: MissionPhase | null;
  currentPhase: MissionPhase;
  generatedAt: string;
}

export interface ExecutiveDigest {
  headline: string;
  recommendation: string;
  risks: string[];
  confidence: number;
  departments: string[];
  generatedAt: string;
}

export interface DigitalCEOBriefs {
  morningBrief: MorningBrief;
  missionBrief: MissionBrief;
  ceoBrief: CEOBrief;
  dailyPriorities: DailyPriority[];
  weeklyReview: WeeklyReview;
  executiveDigest: ExecutiveDigest;
}

export interface ProactiveCEOState {
  missionId: string;
  briefs: DigitalCEOBriefs | null;
  openingMessage: string | null;
  lastMorningBriefDate: string | null;
  lastWeeklyReviewDate: string | null;
  openingInjectedAt: string | null;
  dismissed: boolean;
  generatedAt: string;
}

export interface ProactiveInitResult {
  state: ProactiveCEOState;
  missionUpdated: boolean;
  injectedMessage: string | null;
}
