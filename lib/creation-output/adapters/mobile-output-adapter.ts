/** PROGRAM 5350 — Mobile output adapter (Mobile Factory preview). */

import type { CreationOutput, MobileApplicationOutputPayload } from "../types";
import { createOutputId } from "../output-registry";
import { MOBILE_DEMO_SCREENS } from "../demo-fixtures";

export interface MobileAdapterInput {
  missionId: string;
  ventureId?: string;
  ideaText: string;
  projectName: string;
}

export async function buildMobileOutput(input: MobileAdapterInput): Promise<CreationOutput> {
  const { createMobileProject } = await import("@/lib/mobile-factory");
  const { generateExpoPreview } = await import("@/lib/mobile-factory/preview");

  const project = createMobileProject(input.ideaText, input.projectName);
  const expoPreview = generateExpoPreview(project.name, project.id);
  const now = new Date().toISOString();

  const payload: MobileApplicationOutputPayload = {
    projectId: project.id,
    deviceFrames: ["iphone", "android"],
    screens: MOBILE_DEMO_SCREENS,
    orientation: "portrait",
    offlineState: "Cache demo — sin sync real",
    permissions: ["location", "camera", "notifications"],
    apiDependencies: ["/api/demo", "supabase-sandbox"],
    expoPreviewPlan: "PREVIEW PLAN — Expo Go simulado (no APK real)",
  };

  return {
    outputId: createOutputId("MOBILE_APPLICATION_OUTPUT"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    type: "MOBILE_APPLICATION_OUTPUT",
    title: `${input.projectName} — Mobile App`,
    status: "PREVIEW_READY",
    version: "1.0.0",
    createdAt: now,
    updatedAt: now,
    factoryProjectId: project.id,
    sourceArtifacts: [
      {
        artifactId: `art-mobile-${project.id}`,
        type: "mobile",
        label: "Mobile Project",
        href: `/mobile-factory/${project.id}`,
      },
    ],
    previewMode: "preview-plan",
    previewUrl: undefined,
    files: [
      { path: "app/(tabs)/index.tsx", kind: "file", description: "Home screen" },
      { path: "app/_layout.tsx", kind: "file", description: "Root layout" },
    ],
    routes: payload.screens,
    screenshots: [
      { id: "ss-iphone", label: "iPhone", device: "mobile", placeholder: true },
      { id: "ss-android", label: "Android", device: "mobile", placeholder: true },
    ],
    approvals: [],
    warnings: [
      {
        id: "w-mobile-expo",
        severity: "info",
        message: `Expo Preview Plan — ${expoPreview.status} (no dispositivo real)`,
        code: "PREVIEW_SAFETY",
      },
    ],
    nextActions: [
      { id: "na-preview", label: "Device frame preview", kind: "preview" },
      { id: "na-export", label: "Expo Preview Plan", kind: "export", href: `/mobile-factory/${project.id}` },
    ],
    payload,
    validation: {
      score: 82,
      passed: true,
      checks: [
        { id: "screens", label: `${payload.screens.length} pantallas`, status: "pass" },
        { id: "expo", label: "Expo preview plan", status: "pass" },
      ],
      source: "adapter",
    },
  };
}

export async function loadMobileProject(projectId: string) {
  const { getProjectById } = await import("@/lib/mobile-factory");
  return getProjectById(projectId);
}
