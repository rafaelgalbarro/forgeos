/** RC9 — Installation engine (sandbox simulate only — NO real installs). */

import { loadExtensions } from "./extension-loader";
import { getEcosystemPackById, getCrmDemoPack } from "./catalog";
import { resolvePackDependencies } from "./dependency-resolver";
import { simulatePluginLoad } from "./plugin-engine";
import {
  ECOSYSTEM_SANDBOX_DISCLAIMER,
  type InstallSimulationResult,
  type InstallSimulationStep,
  type SandboxMode,
} from "./types";

export interface SimulateInstallRequest {
  packId: string;
  ventureId: string;
  mode?: SandboxMode;
}

const SIMULATION_STEPS: { id: string; label: string }[] = [
  { id: "validate", label: "Validar pack y versión" },
  { id: "deps", label: "Resolver dependencias" },
  { id: "extensions", label: "Cargar extensiones (sandbox)" },
  { id: "plugins", label: "Registrar plugins" },
  { id: "capabilities", label: "Activar capacidades" },
  { id: "ceo", label: "Notificar al CEO" },
];

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function simulateInstallAsync(
  request: SimulateInstallRequest
): Promise<InstallSimulationResult> {
  const start = Date.now();
  const pack = getEcosystemPackById(request.packId);
  if (!pack) {
    return {
      packId: request.packId,
      packName: request.packId,
      mode: request.mode ?? "simulate",
      success: false,
      steps: [{ id: "validate", label: "Validar", status: "done", message: "Pack no encontrado" }],
      ceoMessage: "",
      disclaimer: ECOSYSTEM_SANDBOX_DISCLAIMER,
      resolvedDependencies: [],
      durationMs: Date.now() - start,
    };
  }

  const mode = request.mode ?? "simulate";
  const steps: InstallSimulationStep[] = [];
  const deps = resolvePackDependencies(request.packId);

  for (const stepDef of SIMULATION_STEPS) {
    const step: InstallSimulationStep = { ...stepDef, status: "running" };
    steps.push(step);
    await delay(80);

    switch (stepDef.id) {
      case "validate":
        step.status = "done";
        step.message = `${pack.name} v${pack.version} validado`;
        break;
      case "deps":
        step.status = deps.missing.length > 0 ? "done" : "done";
        step.message =
          deps.missing.length > 0
            ? `Dependencias simuladas: ${deps.resolved.join(", ")} (faltantes ignorados en sandbox)`
            : `Dependencias resueltas: ${deps.resolved.join(", ")}`;
        break;
      case "extensions":
        const extResult = loadExtensions({
          packId: request.packId,
          extensions: pack.dependencies,
          mode,
        });
        step.status = "done";
        step.message = `${extResult.loaded.length} extensiones cargadas (sandbox)`;
        break;
      case "plugins":
        const pluginDeps = pack.dependencies.filter((d) => d.startsWith("eco-plugin-"));
        for (const pid of pluginDeps) simulatePluginLoad(pid);
        step.status = "done";
        step.message = `${pluginDeps.length} plugins registrados`;
        break;
      case "capabilities":
        step.status = "done";
        step.message = `Capacidades activas: ${pack.capabilities.join(", ")}`;
        break;
      case "ceo":
        step.status = "done";
        step.message = "CEO notificado";
        break;
    }
  }

  const ceoMessage = `CEO ya puede utilizar esta capacidad: ${pack.capabilities[0] ?? pack.name}`;

  return {
    packId: request.packId,
    packName: pack.name,
    mode,
    success: true,
    steps,
    ceoMessage,
    disclaimer: ECOSYSTEM_SANDBOX_DISCLAIMER,
    resolvedDependencies: deps.resolved,
    durationMs: Date.now() - start,
  };
}

/** Synchronous wrapper for UI — runs simulation without real async delay. */
export function simulateInstall(request: SimulateInstallRequest): InstallSimulationResult {
  const pack = getEcosystemPackById(request.packId);
  const mode = request.mode ?? "simulate";
  if (!pack) {
    return {
      packId: request.packId,
      packName: request.packId,
      mode,
      success: false,
      steps: [{ id: "validate", label: "Validar", status: "done", message: "Pack no encontrado" }],
      ceoMessage: "",
      disclaimer: ECOSYSTEM_SANDBOX_DISCLAIMER,
      resolvedDependencies: [],
      durationMs: 0,
    };
  }

  const deps = resolvePackDependencies(request.packId);
  const extResult = loadExtensions({
    packId: request.packId,
    extensions: pack.dependencies,
    mode,
  });
  const pluginDeps = pack.dependencies.filter((d) => d.startsWith("eco-plugin-"));
  for (const pid of pluginDeps) simulatePluginLoad(pid);

  const steps: InstallSimulationStep[] = SIMULATION_STEPS.map((s) => {
    let message = "";
    switch (s.id) {
      case "validate":
        message = `${pack.name} v${pack.version} validado`;
        break;
      case "deps":
        message = `Dependencias: ${deps.resolved.join(", ")}`;
        break;
      case "extensions":
        message = `${extResult.loaded.length} extensiones (sandbox)`;
        break;
      case "plugins":
        message = `${pluginDeps.length} plugins registrados`;
        break;
      case "capabilities":
        message = pack.capabilities.join(", ");
        break;
      case "ceo":
        message = "CEO notificado";
        break;
    }
    return { ...s, status: "done" as const, message };
  });

  return {
    packId: request.packId,
    packName: pack.name,
    mode,
    success: true,
    steps,
    ceoMessage: `CEO ya puede utilizar esta capacidad: ${pack.capabilities[0] ?? pack.name}`,
    disclaimer: ECOSYSTEM_SANDBOX_DISCLAIMER,
    resolvedDependencies: deps.resolved,
    durationMs: 12,
  };
}

export function runCrmDemoInstall(ventureId: string): InstallSimulationResult {
  const crm = getCrmDemoPack();
  return simulateInstall({ packId: crm.id, ventureId, mode: "simulate" });
}
