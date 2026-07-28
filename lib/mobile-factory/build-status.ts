/** Program 4600 — Android/iOS build status tracker (stub). */

import type { BuildStatus, PlatformBuild } from "./types";

function createBuildId(platform: "android" | "ios"): string {
  const prefix = platform === "android" ? "apk" : "ipa";
  const ts = Date.now().toString(36);
  return `${prefix}-${ts}`;
}

export function createPlatformBuild(platform: "android" | "ios", version = "1.0.0"): PlatformBuild {
  return {
    platform,
    status: "pending",
    buildId: null,
    artifactUrl: null,
    version,
    startedAt: null,
    completedAt: null,
    logs: [],
    stub: true,
  };
}

export async function runPlatformBuild(
  build: PlatformBuild,
  projectSlug: string
): Promise<PlatformBuild> {
  const buildId = createBuildId(build.platform);
  const startedAt = new Date().toISOString();

  const running: PlatformBuild = {
    ...build,
    status: "running",
    buildId,
    startedAt,
    logs: [
      `[${startedAt}] Iniciando build ${build.platform} (stub)…`,
      `[${startedAt}] Compilando bundle Expo…`,
      `[${startedAt}] Generando artefacto ${build.platform === "android" ? "APK" : "IPA"}…`,
    ],
  };

  await delay(build.platform === "android" ? 800 : 1000);

  const completedAt = new Date().toISOString();
  const ext = build.platform === "android" ? "apk" : "ipa";

  return {
    ...running,
    status: "success",
    completedAt,
    artifactUrl: `https://builds.forgeos.dev/${projectSlug}/${buildId}.${ext}`,
    logs: [
      ...running.logs,
      `[${completedAt}] Build completado (simulado — sin dispositivo real).`,
      `[${completedAt}] Artefacto: ${buildId}.${ext}`,
    ],
  };
}

export function formatBuildSummary(build: PlatformBuild): string {
  const label = build.platform === "android" ? "Android" : "iOS";
  return `${label} · ${build.status} · v${build.version}${build.stub ? " (stub)" : ""}`;
}

export function getBuildStatusVariant(
  status: BuildStatus
): "default" | "accent" | "amber" | "red" {
  switch (status) {
    case "success":
      return "accent";
    case "running":
      return "amber";
    case "failed":
      return "red";
    default:
      return "default";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
