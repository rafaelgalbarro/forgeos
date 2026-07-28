/** PROGRAM 6060 — Map Query Layer V2 / light snapshots → presentation view models.
 * PROGRAM 6085 — Prefer file-backed composition root when mission exists (canonical SoT).
 */

import {
  getCompanyOverview,
  getMissionOverview,
  getMissionPlan,
  getStudioSections,
  type DataProvenance,
  type MissionOverviewSnapshot,
} from "@/src/core/application/experience-snapshots";
import { getCompositionRoot } from "@/src/core/composition";
import type {
  ActivityHubVM,
  CompanyOsVM,
  MissionControlVM,
  MissionPageVM,
  ProvenanceBadgeVM,
  StudioHubVM,
} from "../view-models/types";

function badge(p: DataProvenance): ProvenanceBadgeVM {
  const tone =
    p === "LIVE" ? "live" : p === "CONNECTED" ? "connected" : p === "ESTIMATED" ? "estimated" : "demo";
  return { label: p, tone };
}

function liveOverviewFromStore(missionId?: string | null): MissionOverviewSnapshot | null {
  try {
    const root = getCompositionRoot();
    const id = missionId?.trim() || null;
    if (id) {
      const mission = root.store.missions.get(id);
      if (!mission) return null;
      const snap = root.store.deliverySnapshots.get(id) as
        | { outputs?: Array<{ outputId: string; title: string; status: string }> }
        | undefined;
      const plan = root.store.workflowPlans.get(id) as
        | { status?: string; stages?: Array<{ stageId: string; label: string; status: string }> }
        | undefined;
      const preview = root.store.previewClassifications.get(id);
      const outputs = (snap?.outputs || []).map((o) => ({
        id: o.outputId,
        label: o.title,
        status: o.status,
      }));
      const missionRecord = mission as {
        intent?: { primary?: string };
        idea?: string;
        status?: string;
        timeline?: Array<{ id: string; at: string; label: string; type: string }>;
        pendingDecisions?: Array<{ id: string; title?: string; prompt?: string; resolved?: boolean }>;
        risks?: Array<{ id: string; label: string; severity: string }>;
      };
      const stages = plan?.stages || [];
      const openDecision =
        missionRecord.pendingDecisions?.find((d) => !d.resolved) ?? null;
      return {
        meta: {
          query: "GetMissionOverview",
          generatedAt: new Date().toISOString(),
          provenance: "LIVE",
          availability: "ready",
          message: preview ? `preview=${preview}` : undefined,
        },
        missionId: id,
        objective:
          missionRecord.intent?.primary || missionRecord.idea || `Mission ${id}`,
        stage: plan?.status || missionRecord.status || "unknown",
        nextDecision: openDecision
          ? openDecision.title || openDecision.prompt || openDecision.id
          : null,
        nextAction: openDecision
          ? "Resolver decisión pendiente"
          : outputs.some((o) => /fail|error|block/i.test(o.status))
            ? "Revisar outputs bloqueados"
            : "Continuar workflow / revisar Studio",
        ceoOpening: "Estado cargado desde composition root (.forgeos/v2-store).",
        planSummary: stages.map((s) => s.label),
        outputs,
        activity: (missionRecord.timeline || []).slice(-8).map((t) => ({
          id: t.id,
          at: t.at,
          label: t.label,
          kind: t.type,
        })),
        risks: missionRecord.risks || [],
        approvals: (missionRecord.pendingDecisions || []).map((d) => ({
          id: d.id,
          label: d.title || d.prompt || d.id,
          status: (d.resolved ? "approved" : "pending") as "pending" | "approved" | "rejected",
        })),
      };
    }
    const first = [...root.store.missions.keys()][0] ?? null;
    if (!first) return null;
    return liveOverviewFromStore(first);
  } catch {
    return null;
  }
}

function planStagesFromStore(
  missionId: string | null
): { id: string; label: string; status: string }[] {
  if (!missionId) return [];
  try {
    const root = getCompositionRoot();
    const plan = root.store.workflowPlans.get(missionId) as
      | { stages?: Array<{ stageId: string; label: string; status: string }> }
      | undefined;
    return (plan?.stages || []).map((s) => ({
      id: s.stageId,
      label: s.label,
      status: s.status,
    }));
  } catch {
    return [];
  }
}

export function toMissionControlVM(snapshot: MissionOverviewSnapshot): MissionControlVM {
  const fromStore = planStagesFromStore(snapshot.missionId);
  // Prefer real stage statuses from store; labels without status stay "unknown" (never infer completed).
  const stages =
    fromStore.length > 0
      ? fromStore
      : snapshot.planSummary.map((label, i) => ({
          id: `plan-${i}`,
          label,
          status: "unknown",
        }));

  const primaryCta = {
    label:
      snapshot.meta.availability === "empty" || !snapshot.missionId
        ? "Create Venture"
        : snapshot.nextDecision
          ? "Resolver decisión"
          : snapshot.nextAction?.slice(0, 48) || "Continuar misión",
    href:
      snapshot.meta.availability === "empty" || !snapshot.missionId
        ? "/os/creator"
        : snapshot.nextDecision && snapshot.missionId
          ? `/missions/${snapshot.missionId}?section=decisions`
          : snapshot.missionId
            ? `/mission-control/${snapshot.missionId}`
            : "/mission-control",
  };

  return {
    missionId: snapshot.missionId,
    objective: snapshot.objective,
    stage: snapshot.stage,
    nextDecision: snapshot.nextDecision,
    nextAction: snapshot.nextAction,
    ceoOpening: snapshot.ceoOpening,
    planSummary: snapshot.planSummary,
    planStages: stages,
    outputs: snapshot.outputs,
    activity: snapshot.activity,
    risks: snapshot.risks,
    approvals: snapshot.approvals,
    primaryCta,
    provenance: badge(snapshot.meta.provenance),
    availability: snapshot.meta.availability,
    message: snapshot.meta.message,
    degradedReason: snapshot.meta.degradedReason,
  };
}

/** Presentation adapter — prefers composition LIVE store; falls back to light DEMO snapshot. */
export function loadMissionControlVM(missionId?: string | null): MissionControlVM {
  try {
    const live = liveOverviewFromStore(missionId);
    if (live) return toMissionControlVM(live);
    return toMissionControlVM(getMissionOverview(missionId));
  } catch {
    return {
      missionId: missionId ?? null,
      objective: "Mission Control temporalmente degradado",
      stage: "unknown",
      nextDecision: null,
      nextAction: "Reintentar o abrir Activity",
      ceoOpening: "No pude cargar el overview. Los motores pesados no se cargan en el cliente.",
      planSummary: [],
      planStages: [],
      outputs: [],
      activity: [],
      risks: [],
      approvals: [],
      primaryCta: { label: "Reintentar", href: "/mission-control" },
      provenance: badge("DEMO"),
      availability: "degraded",
      degradedReason: "Query Layer adapter fallback",
    };
  }
}

export function loadMissionPageVM(missionId: string): MissionPageVM {
  const overview = loadMissionControlVM(missionId);
  let plan = getMissionPlan(missionId);
  try {
    const root = getCompositionRoot();
    const wf = root.store.workflowPlans.get(missionId) as
      | { stages?: Array<{ stageId: string; label: string; status: string }> }
      | undefined;
    if (wf?.stages?.length) {
      plan = {
        meta: {
          query: "GetMissionPlan",
          generatedAt: new Date().toISOString(),
          provenance: "LIVE",
          availability: "ready",
        },
        missionId,
        stages: wf.stages.map((s) => ({
          id: s.stageId,
          label: s.label,
          status: s.status,
        })),
        milestones: wf.stages.map((s) => s.label),
      };
    }
  } catch {
    /* keep light plan */
  }
  const base = `/missions/${missionId}`;
  return {
    missionId,
    title: `Misión ${missionId}`,
    sections: [
      { id: "overview", label: "Overview", href: `${base}?section=overview` },
      { id: "plan", label: "Plan", href: `${base}?section=plan` },
      { id: "conversation", label: "Conversation", href: `${base}?section=conversation` },
      { id: "decisions", label: "Decisions", href: `${base}?section=decisions` },
      { id: "activity", label: "Activity", href: `${base}?section=activity` },
      { id: "outputs", label: "Outputs", href: `${base}?section=outputs` },
      { id: "costs", label: "Costs", href: `${base}?section=costs` },
      { id: "history", label: "History", href: `${base}?section=history` },
    ],
    overview,
    planStages: plan.stages,
    provenance: badge(plan.meta.provenance),
    availability: overview.availability,
  };
}

export function loadStudioHubVM(missionId: string): StudioHubVM {
  const snap = getStudioSections(missionId);
  let provenance = snap.meta.provenance;
  let availability = snap.meta.availability;
  try {
    const root = getCompositionRoot();
    if (root.store.missions.has(missionId) || root.store.deliverySnapshots.has(missionId)) {
      provenance = "LIVE";
      availability = "ready";
    }
  } catch {
    /* ignore */
  }
  return {
    missionId,
    sections: snap.sections,
    provenance: badge(provenance),
    availability,
  };
}

export function loadCompanyOsVM(ventureId: string): CompanyOsVM {
  const snap = getCompanyOverview(ventureId);
  return {
    ventureId: snap.ventureId,
    name: snap.name,
    executiveSummary: snap.executiveSummary,
    products: snap.products,
    customers: snap.customers.map((c) => ({
      id: c.id,
      label: c.label,
      badge: badge(c.provenance),
    })),
    growth: snap.growth.map((g) => ({
      metric: g.metric,
      value: g.value,
      badge: badge(g.provenance),
    })),
    finance: snap.finance.map((f) => ({
      metric: f.metric,
      value: f.value,
      badge: badge(f.provenance),
    })),
    operations: snap.operations,
    risks: snap.risks,
    roadmap: snap.roadmap,
    activeMissions: snap.activeMissions,
    deployments: snap.deployments.map((d) => ({
      id: d.id,
      label: d.label,
      environment: d.environment,
      badge: badge(d.provenance),
    })),
    provenance: badge(snap.meta.provenance),
    availability: snap.meta.availability,
  };
}

export function loadActivityHubVM(): ActivityHubVM {
  const overview = liveOverviewFromStore(null) ?? getMissionOverview(null);
  return {
    items: [
      {
        id: "act-mc",
        at: overview.meta.generatedAt,
        label: "Mission Control listo (Query Layer V2)",
        href: "/mission-control",
        kind: "system",
      },
      {
        id: "act-studio",
        at: overview.meta.generatedAt,
        label: "Studio V2 — secciones bajo demanda",
        href: "/studio",
        kind: "system",
      },
      {
        id: "act-company",
        at: overview.meta.generatedAt,
        label: "Company OS disponible",
        href: "/company",
        kind: "system",
      },
    ],
    availability: "ready",
    message: "Feed ligero — sin engines en paint inicial.",
  };
}
