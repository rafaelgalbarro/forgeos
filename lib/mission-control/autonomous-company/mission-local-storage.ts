/** Per-mission localStorage for backlog and roadmap items. */

import { readStorage, writeStorage } from "@/lib/beta-platform/storage";
import type { BacklogItem, RoadmapItem } from "./types";

const BACKLOG_PREFIX = "forgeos-mission-company-backlog-";
const ROADMAP_PREFIX = "forgeos-mission-company-roadmap-";

export function readMissionBacklog(missionId: string): BacklogItem[] {
  return readStorage<BacklogItem[]>(`${BACKLOG_PREFIX}${missionId}`, []);
}

export function writeMissionBacklog(missionId: string, items: BacklogItem[]): void {
  writeStorage(`${BACKLOG_PREFIX}${missionId}`, items);
}

export function readMissionRoadmap(missionId: string): RoadmapItem[] {
  return readStorage<RoadmapItem[]>(`${ROADMAP_PREFIX}${missionId}`, []);
}

export function writeMissionRoadmap(missionId: string, items: RoadmapItem[]): void {
  writeStorage(`${ROADMAP_PREFIX}${missionId}`, items);
}

export function seedDemoBacklog(missionId: string): BacklogItem[] {
  const existing = readMissionBacklog(missionId);
  if (existing.length > 0) return existing;
  const demo: BacklogItem[] = [
    {
      id: `bl-${missionId}-1`,
      title: "Onboarding mejorado para nuevos usuarios",
      priority: "high",
      status: "todo",
      createdAt: new Date().toISOString(),
      tags: ["ux", "activation"],
    },
    {
      id: `bl-${missionId}-2`,
      title: "Integración analytics en dashboard",
      priority: "medium",
      status: "in_progress",
      createdAt: new Date().toISOString(),
      tags: ["analytics"],
    },
    {
      id: `bl-${missionId}-3`,
      title: "Documentar flujo de deploy",
      priority: "low",
      status: "todo",
      createdAt: new Date().toISOString(),
      tags: ["docs"],
    },
  ];
  writeMissionBacklog(missionId, demo);
  return demo;
}

export function seedDemoRoadmap(missionId: string): RoadmapItem[] {
  const existing = readMissionRoadmap(missionId);
  if (existing.length > 0) return existing;
  const demo: RoadmapItem[] = [
    {
      id: `rm-${missionId}-1`,
      title: "Gestión autónoma post-deploy",
      quarter: "Q3 2026",
      status: "in-progress",
      votes: 12,
      priority: "high",
    },
    {
      id: `rm-${missionId}-2`,
      title: "Panel NPS integrado",
      quarter: "Q3 2026",
      status: "planned",
      votes: 8,
      priority: "medium",
    },
    {
      id: `rm-${missionId}-3`,
      title: "Alertas de incidentes en tiempo real",
      quarter: "Q4 2026",
      status: "planned",
      votes: 5,
      priority: "medium",
    },
  ];
  writeMissionRoadmap(missionId, demo);
  return demo;
}
