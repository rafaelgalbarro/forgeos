/** Ranked daily priorities from decisions, queue, and risks. */

import type { Mission } from "../types";
import type { DailyPriority } from "./types";
import { getPendingDecisions } from "../decision-center";
import { missionToContext } from "../pair-founder/pair-founder-engine";
import { readVentureMemory } from "../pair-founder/venture-memory";
import { detectRisks } from "../pair-founder/risk-detection";
import { prioritizeDecisions } from "../pair-founder/decision-prioritization";
import { ensureLiveMission } from "../live-mission/event-emitter";

export function generateDailyPriorities(mission: Mission): DailyPriority[] {
  const priorities: DailyPriority[] = [];
  const ctx = missionToContext(mission);
  const memory = readVentureMemory(mission.id);
  const risks = detectRisks(ctx, memory);
  const orderedDecisions = prioritizeDecisions(mission.pendingDecisions, ctx, risks);

  for (const d of orderedDecisions.filter((x) => !x.resolved).slice(0, 3)) {
    priorities.push({
      rank: priorities.length + 1,
      title: d.title,
      description: d.description,
      impact: d.important ? "high" : "medium",
      source: "decision-center",
      linkedId: d.id,
    });
  }

  const withLive = ensureLiveMission(mission);
  const queuedTasks = (withLive.liveMission?.tasks ?? []).filter(
    (t) => t.status === "Queued" || t.status === "Running"
  );
  for (const t of queuedTasks.slice(0, 2)) {
    priorities.push({
      rank: priorities.length + 1,
      title: t.label,
      description: `Tarea ${t.status} — ${t.department ?? "equipo"}`,
      impact: t.status === "Running" ? "high" : "medium",
      source: "mission-queue",
      linkedId: t.id,
    });
  }

  for (const r of risks.filter((x) => x.severity === "high" || x.severity === "critical").slice(0, 2)) {
    if (priorities.length >= 5) break;
    priorities.push({
      rank: priorities.length + 1,
      title: `Mitigar: ${r.title}`,
      description: r.mitigation ?? r.description,
      impact: r.severity === "critical" ? "high" : "medium",
      source: "risk",
      linkedId: r.id,
    });
  }

  const recentTimeline = mission.timeline.slice(-3).reverse();
  for (const ev of recentTimeline) {
    if (priorities.length >= 5) break;
    if (priorities.some((p) => p.title === ev.label)) continue;
    priorities.push({
      rank: priorities.length + 1,
      title: ev.label,
      description: "Seguimiento desde timeline",
      impact: "low",
      source: "timeline",
      linkedId: ev.id,
    });
  }

  return priorities.slice(0, 5).map((p, i) => ({ ...p, rank: i + 1 }));
}

export function formatDailyPrioritiesReminder(priorities: DailyPriority[]): string {
  if (!priorities.length) return "Sin prioridades urgentes — avanza en la fase actual.";
  const top = priorities.slice(0, 3).map((p) => p.title).join(", ");
  return `Prioridades de hoy: ${top}.`;
}
