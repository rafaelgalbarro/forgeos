"use server";

import {
  startSandbox,
  stopSandbox,
  restartSandbox,
  cleanupSandbox,
  getSandbox,
  getSandboxLogs,
  getSandboxes,
  detectDocker,
  monitorSandboxResources,
  runNexoraPreviewE2E,
} from "@/lib/preview-runtime/server";
import type { StartSandboxRequest } from "@/lib/preview-runtime/types";

export async function startPreviewSandboxAction(request: StartSandboxRequest) {
  return startSandbox(request);
}

export async function stopPreviewSandboxAction(id: string) {
  return stopSandbox(id);
}

export async function restartPreviewSandboxAction(id: string) {
  return restartSandbox(id);
}

export async function cleanupPreviewSandboxAction(id: string, fullRemove = false) {
  return cleanupSandbox(id, fullRemove);
}

export async function getPreviewSandboxAction(id: string) {
  return getSandbox(id) ?? null;
}

export async function listPreviewSandboxesAction(missionId?: string) {
  return getSandboxes(missionId ? { missionId } : undefined);
}

export async function getPreviewLogsAction(id: string, offset = 0, limit = 100) {
  return getSandboxLogs(id, offset, limit);
}

export async function detectDockerAction() {
  return detectDocker();
}

export async function monitorSandboxAction(id: string) {
  return monitorSandboxResources(id);
}

export async function runNexoraE2EAction() {
  return runNexoraPreviewE2E();
}
