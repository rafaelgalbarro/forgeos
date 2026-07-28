/** Program 4600 — Expo preview descriptor / QR stub. */

import type { BuildStatus, ExpoPreview } from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateExpoPreview(projectName: string, projectId: string): ExpoPreview {
  const slug = slugify(projectName) || "mobile-app";
  const previewUrl = `https://expo.dev/preview/${slug}-${projectId.slice(0, 8)}`;
  const expoGoUrl = `exp://exp.host/@forgeos/${slug}`;

  return {
    projectSlug: slug,
    previewUrl,
    qrCodeData: `forgeos-expo://${slug}?id=${projectId}`,
    expoGoUrl,
    status: "success",
    lastUpdated: new Date().toISOString(),
  };
}

export function updatePreviewStatus(
  preview: ExpoPreview,
  status: BuildStatus
): ExpoPreview {
  return {
    ...preview,
    status,
    lastUpdated: new Date().toISOString(),
  };
}

export function formatPreviewSummary(preview: ExpoPreview): string {
  return `Expo Go · ${preview.projectSlug} · ${preview.status}`;
}
