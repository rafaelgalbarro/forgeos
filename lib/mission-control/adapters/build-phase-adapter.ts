/** PROGRAM 5150 — BUILD phase adapters (on-demand dynamic imports only). */

import type { MissionSession, MissionArtifact, IntentionType } from "../types";

export interface BuildPhaseResult {
  artifacts: MissionArtifact[];
  summary: string;
}

export async function runBuildPhasePreview(session: MissionSession): Promise<BuildPhaseResult> {
  const idea = session.intent?.extractedIdea ?? "Misión";
  const primary = session.intent?.primary;
  const secondary = session.intent?.secondary ?? [];
  const intentions = new Set<IntentionType>([primary, ...secondary].filter(Boolean) as IntentionType[]);

  const artifacts: MissionArtifact[] = [];
  const now = new Date().toISOString();
  const parts: string[] = [];

  if (intentions.has("WEBSITE") || intentions.has("VENTURE")) {
    const web = await loadWebsitePreview(idea);
    artifacts.push({
      id: `art-web-${Date.now()}`,
      type: "preview",
      label: "Website Factory preview",
      phase: "BUILD",
      source: "demo",
      href: web.href,
      summary: "Landing preview — sin deploy real",
      createdAt: now,
    });
    parts.push("website preview");
  }

  if (intentions.has("APPLICATION") || intentions.has("VENTURE")) {
    const app = await loadApplicationPreview(idea);
    artifacts.push({
      id: `art-app-${Date.now()}`,
      type: "preview",
      label: "Application Factory preview",
      phase: "BUILD",
      source: "demo",
      href: app.href,
      summary: "App preview — sin build real",
      createdAt: now,
    });
    parts.push("application preview");
  }

  if (intentions.has("MOBILE") || shouldSuggestMobile(idea)) {
    const mobile = await loadMobilePreview(idea);
    artifacts.push({
      id: `art-mobile-${Date.now()}`,
      type: "preview",
      label: "Mobile Factory preview",
      phase: "BUILD",
      source: "demo",
      href: mobile.href,
      summary: "Mobile readiness eval — no build real",
      createdAt: now,
    });
    parts.push("mobile readiness");
  }

  const buildContext = await loadBuildContextPreview(idea);
  artifacts.push({
    id: `art-ctx-${Date.now()}`,
    type: "build",
    label: "Build Context",
    phase: "BUILD",
    source: "heuristic",
    summary: buildContext.summary,
    createdAt: now,
  });

  const pipeline = await loadBuildPipelinePreview();
  artifacts.push({
    id: `art-pipe-${Date.now()}`,
    type: "build",
    label: "Build Pipeline",
    phase: "BUILD",
    source: "demo",
    summary: pipeline.summary,
    createdAt: now,
  });

  return {
    artifacts,
    summary: `BUILD completado (preview/demo): ${parts.join(", ") || "plan de build"}. Sin despliegue productivo.`,
  };
}

function shouldSuggestMobile(idea: string): boolean {
  return /técnico|campo|ruta|gps|móvil/i.test(idea);
}

async function loadWebsitePreview(idea: string): Promise<{ href: string }> {
  const { createWebsiteMission } = await import("./website-factory-adapter");
  const result = await createWebsiteMission(idea);
  return { href: result.href };
}

async function loadApplicationPreview(idea: string): Promise<{ href: string }> {
  const { createApplicationMission } = await import("./application-factory-adapter");
  const result = await createApplicationMission(idea);
  return { href: result.href };
}

async function loadMobilePreview(idea: string): Promise<{ href: string }> {
  const { createMobileMission } = await import("./mobile-factory-adapter");
  const result = await createMobileMission(idea);
  return { href: result.href };
}

async function loadBuildContextPreview(idea: string): Promise<{ summary: string }> {
  try {
    const { buildBuildContextFromVenture } = await import("@/lib/build-platform/build-context");
    const ctx = buildBuildContextFromVenture(
      {
        id: "preview",
        name: idea.slice(0, 40),
        ideaText: idea,
        sections: [],
      } as unknown as import("@/lib/domain/venture").VentureProject,
      { persist: false, recordHistory: false }
    );
    const sectionCount = Object.keys(ctx.sections ?? {}).length;
    return { summary: `Build context: ${sectionCount} secciones (heuristic)` };
  } catch {
    return { summary: "Build context heuristic — Next.js + Supabase" };
  }
}

async function loadBuildPipelinePreview(): Promise<{ summary: string }> {
  try {
    const { getBuildPipelineSnapshot } = await import("@/lib/build-pipeline");
    const snap = await getBuildPipelineSnapshot("preview", "mission-control");
    return { summary: `Pipeline: ${snap.stages?.length ?? 5} pasos (dry-run)` };
  } catch {
    return { summary: "Pipeline preview — 5 etapas demo" };
  }
}
