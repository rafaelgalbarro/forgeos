/** STEP 1 — Founder profile persistence (workspace-scoped repository). */

import type { FounderProfile } from "./types";

const STORAGE_PREFIX = "forgeos-founder-profile-";
const DEFAULT_WORKSPACE = "ws-default";

export const DEFAULT_FOUNDER_PROFILE: FounderProfile = {
  objetivos: [],
  experiencia: "",
  sectores: [],
  toleranciaRiesgo: "balanced",
  presupuesto: "",
  tiempoDisponible: "",
  preferencias: [],
  tipoEmpresaDeseada: "",
  estrategiaCrecimiento: "",
  restricciones: [],
  updatedAt: new Date().toISOString(),
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

export interface FounderProfileRepository {
  findByWorkspace(workspaceId: string): FounderProfile;
  save(workspaceId: string, profile: Partial<FounderProfile>): FounderProfile;
  adaptFromInput(workspaceId: string, input: string): FounderProfile;
}

class LocalStorageFounderProfileRepository implements FounderProfileRepository {
  findByWorkspace(workspaceId: string): FounderProfile {
    if (!isBrowser()) return { ...DEFAULT_FOUNDER_PROFILE };
    try {
      const raw = localStorage.getItem(storageKey(workspaceId));
      return raw
        ? { ...DEFAULT_FOUNDER_PROFILE, ...(JSON.parse(raw) as Partial<FounderProfile>) }
        : { ...DEFAULT_FOUNDER_PROFILE };
    } catch {
      return { ...DEFAULT_FOUNDER_PROFILE };
    }
  }

  save(workspaceId: string, profile: Partial<FounderProfile>): FounderProfile {
    const merged: FounderProfile = {
      ...this.findByWorkspace(workspaceId),
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    if (isBrowser()) {
      localStorage.setItem(storageKey(workspaceId), JSON.stringify(merged));
    }
    return merged;
  }

  adaptFromInput(workspaceId: string, input: string): FounderProfile {
    const profile = this.findByWorkspace(workspaceId);
    const lower = input.toLowerCase();
    const updates: Partial<FounderProfile> = {};

    if (/b2b|empresa|enterprise/.test(lower) && !profile.tipoEmpresaDeseada) {
      updates.tipoEmpresaDeseada = "B2B / Enterprise";
    }
    if (/b2c|consumidor|retail/.test(lower) && !profile.tipoEmpresaDeseada) {
      updates.tipoEmpresaDeseada = "B2C";
    }
    if (/saas|software/.test(lower) && !profile.sectores.includes("SaaS")) {
      updates.sectores = [...profile.sectores, "SaaS"].slice(0, 8);
    }
    if (/marketplace|plataforma/.test(lower) && !profile.sectores.includes("Marketplace")) {
      updates.sectores = [...profile.sectores, "Marketplace"].slice(0, 8);
    }
    if (/\d+\s*(€|eur|usd|\$|k)/i.test(input) && !profile.presupuesto) {
      const match = input.match(/\d[\d.,\s]*(€|eur|usd|\$|k)?/i);
      if (match) updates.presupuesto = match[0].trim();
    }
    if (/(2|dos|3|tres)\s*semanas?|mes(es)?|año/i.test(lower) && !profile.tiempoDisponible) {
      updates.tiempoDisponible = input.slice(0, 60);
    }
    if (/conservador|seguro|prudente/.test(lower)) updates.toleranciaRiesgo = "conservative";
    if (/arriesgar|agresivo|ambicioso/.test(lower)) updates.toleranciaRiesgo = "aggressive";
    if (/crecer|escalar|growth|viral/.test(lower) && !profile.estrategiaCrecimiento) {
      updates.estrategiaCrecimiento = "Crecimiento acelerado";
    }
    if (/bootstrap|orgánico|sin inversión/.test(lower) && !profile.estrategiaCrecimiento) {
      updates.estrategiaCrecimiento = "Bootstrap / orgánico";
    }
    if (/sin equipo|solo|freelance/.test(lower)) {
      updates.restricciones = [...profile.restricciones, "Recursos limitados"].slice(0, 6);
    }

    if (Object.keys(updates).length) return this.save(workspaceId, updates);
    return profile;
  }
}

let _repo: FounderProfileRepository | null = null;

export function getFounderProfileRepository(): FounderProfileRepository {
  if (!_repo) _repo = new LocalStorageFounderProfileRepository();
  return _repo;
}

export function readFounderProfile(workspaceId = DEFAULT_WORKSPACE): FounderProfile {
  return getFounderProfileRepository().findByWorkspace(workspaceId);
}

export function writeFounderProfile(workspaceId: string, profile: Partial<FounderProfile>): FounderProfile {
  return getFounderProfileRepository().save(workspaceId, profile);
}

export function adaptFounderProfileFromInput(workspaceId: string, input: string): FounderProfile {
  return getFounderProfileRepository().adaptFromInput(workspaceId, input);
}

export function profileSummaryForContext(profile: FounderProfile): string {
  const parts: string[] = [];
  if (profile.objetivos.length) parts.push(`Objetivos: ${profile.objetivos.join(", ")}`);
  if (profile.tipoEmpresaDeseada) parts.push(`Tipo empresa: ${profile.tipoEmpresaDeseada}`);
  if (profile.presupuesto) parts.push(`Presupuesto: ${profile.presupuesto}`);
  if (profile.tiempoDisponible) parts.push(`Tiempo: ${profile.tiempoDisponible}`);
  if (profile.estrategiaCrecimiento) parts.push(`Crecimiento: ${profile.estrategiaCrecimiento}`);
  if (profile.restricciones.length) parts.push(`Restricciones: ${profile.restricciones.join("; ")}`);
  return parts.join(" · ") || "Perfil founder pendiente de completar";
}
