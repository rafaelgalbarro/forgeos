/** PROGRAM 6060 — View models (presentation DTOs). Components must not receive domain aggregates. */

import type { DataProvenance, ViewAvailability } from "@/src/core/application/experience-snapshots";

export interface ProvenanceBadgeVM {
  label: DataProvenance;
  tone: "demo" | "estimated" | "connected" | "live";
}

export interface MissionControlVM {
  missionId: string | null;
  objective: string;
  stage: string;
  nextDecision: string | null;
  nextAction: string;
  ceoOpening: string;
  planSummary: string[];
  /** Real workflow stages from read model (status not inferred as completed). */
  planStages: { id: string; label: string; status: string }[];
  outputs: { id: string; label: string; status: string }[];
  activity: { id: string; at: string; label: string; kind: string }[];
  risks: { id: string; label: string; severity: string }[];
  approvals: { id: string; label: string; status: string }[];
  primaryCta: { label: string; href: string };
  provenance: ProvenanceBadgeVM;
  availability: ViewAvailability;
  message?: string;
  degradedReason?: string;
}

export interface MissionPageSectionVM {
  id: string;
  label: string;
  href: string;
}

export interface MissionPageVM {
  missionId: string;
  title: string;
  sections: MissionPageSectionVM[];
  overview: MissionControlVM;
  planStages: { id: string; label: string; status: string }[];
  provenance: ProvenanceBadgeVM;
  availability: ViewAvailability;
}

export interface StudioHubVM {
  missionId: string;
  sections: { id: string; label: string; href: string; available: boolean }[];
  provenance: ProvenanceBadgeVM;
  availability: ViewAvailability;
}

export interface CompanyOsVM {
  ventureId: string;
  name: string;
  executiveSummary: string;
  products: { id: string; name: string; status: string }[];
  customers: { id: string; label: string; badge: ProvenanceBadgeVM }[];
  growth: { metric: string; value: string; badge: ProvenanceBadgeVM }[];
  finance: { metric: string; value: string; badge: ProvenanceBadgeVM }[];
  operations: string[];
  risks: { id: string; label: string; severity: string }[];
  roadmap: { id: string; label: string; when: string }[];
  activeMissions: { id: string; title: string; href: string }[];
  deployments: { id: string; label: string; environment: string; badge: ProvenanceBadgeVM }[];
  provenance: ProvenanceBadgeVM;
  availability: ViewAvailability;
}

export interface ActivityHubVM {
  items: { id: string; at: string; label: string; href?: string; kind: string }[];
  availability: ViewAvailability;
  message?: string;
}

export interface RouteStateVM {
  kind:
    | "loading"
    | "empty"
    | "unavailable"
    | "permission_denied"
    | "partial"
    | "degraded"
    | "error"
    | "ready";
  title: string;
  description: string;
  retryHref?: string;
}
