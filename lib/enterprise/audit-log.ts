/** ForgeOS RC11 — Enterprise audit log. */

import { appendToList, readStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import { uid } from "./state";
import type { AuditAction, AuditLogEntry } from "./types";

export function appendAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): AuditLogEntry {
  const full: AuditLogEntry = {
    ...entry,
    id: uid("aud"),
    timestamp: new Date().toISOString(),
  };
  appendToList(STORAGE_KEYS.enterpriseAudit, full);
  return full;
}

export function listAuditEntries(orgId?: string, limit = 100): AuditLogEntry[] {
  const all = readStorage<AuditLogEntry[]>(STORAGE_KEYS.enterpriseAudit, []);
  const filtered = orgId ? all.filter((e) => e.orgId === orgId) : all;
  return filtered.slice(-limit).reverse();
}

export function formatAuditAction(action: AuditAction): string {
  const labels: Record<AuditAction, string> = {
    "org.created": "Organización creada",
    "org.updated": "Organización actualizada",
    "team.created": "Equipo creado",
    "team.updated": "Equipo actualizado",
    "user.invited": "Usuario invitado",
    "user.role_changed": "Rol cambiado",
    "plan.changed": "Plan cambiado",
    "api_key.created": "API key creada",
    "api_key.revoked": "API key revocada",
    "webhook.created": "Webhook creado",
    "sso.configured": "SSO configurado",
    "scim.enabled": "SCIM habilitado",
  };
  return labels[action] ?? action;
}
