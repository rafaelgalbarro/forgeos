/** RC9 — Package manager (sandbox simulate only). */

import { getEcosystemPackById } from "./catalog";
import { resolvePackDependencies } from "./dependency-resolver";
import { simulateInstall } from "./installation-engine";
import type { EcosystemPack, SandboxMode } from "./types";

export interface PackageResolveResult {
  pack: EcosystemPack;
  dependencies: ReturnType<typeof resolvePackDependencies>;
  installable: boolean;
  warnings: string[];
}

export function resolvePackage(packId: string): PackageResolveResult | null {
  const pack = getEcosystemPackById(packId);
  if (!pack) return null;
  const dependencies = resolvePackDependencies(packId);
  const warnings: string[] = [];
  if (dependencies.missing.length > 0) {
    warnings.push(`Dependencias faltantes: ${dependencies.missing.join(", ")}`);
  }
  if (pack.status === "sandbox") {
    warnings.push("Pack en modo sandbox — solo simulación");
  }
  return {
    pack,
    dependencies,
    installable: dependencies.missing.length === 0,
    warnings,
  };
}

export interface PackageInstallRequest {
  packId: string;
  ventureId: string;
  mode?: SandboxMode;
}

export function installPackage(request: PackageInstallRequest) {
  return simulateInstall({
    packId: request.packId,
    ventureId: request.ventureId,
    mode: request.mode ?? "simulate",
  });
}

export function listInstalledPackages(_ventureId: string): string[] {
  return [];
}
