/** ForgeOS RC11 — Compliance readiness checklist (GDPR / SOC2). */

import { getActiveOrganization, getOrganization } from "./organization-engine";
import type { ComplianceChecklistItem, ComplianceFramework } from "./types";

const CHECKLIST: Omit<ComplianceChecklistItem, "status">[] = [
  { id: "gdpr-dpa", framework: "gdpr", label: "DPA firmado", description: "Acuerdo de procesamiento de datos" },
  { id: "gdpr-export", framework: "gdpr", label: "Exportación de datos", description: "Endpoint de exportación de usuario" },
  { id: "gdpr-delete", framework: "gdpr", label: "Derecho al olvido", description: "Flujo de eliminación de cuenta" },
  { id: "gdpr-consent", framework: "gdpr", label: "Consentimiento", description: "Registro de consentimientos" },
  { id: "soc2-access", framework: "soc2", label: "Control de acceso", description: "RBAC y MFA" },
  { id: "soc2-audit", framework: "soc2", label: "Auditoría", description: "Log inmutable de acciones" },
  { id: "soc2-encrypt", framework: "soc2", label: "Cifrado", description: "Datos en tránsito y reposo" },
  { id: "soc2-incident", framework: "soc2", label: "Respuesta a incidentes", description: "Plan documentado" },
];

export function getComplianceChecklist(orgId?: string): ComplianceChecklistItem[] {
  const org = orgId ? getOrganization(orgId) : getActiveOrganization();

  const plan = org?.plan ?? "free";
  const sso = org?.settings.ssoEnabled ?? false;

  return CHECKLIST.map((item) => {
    let status: ComplianceChecklistItem["status"] = "pending";

    if (plan === "enterprise") {
      if (["soc2-access", "soc2-audit", "gdpr-export"].includes(item.id)) status = "ready";
      else if (["gdpr-dpa", "soc2-encrypt"].includes(item.id)) status = "partial";
    } else if (plan === "pro") {
      if (item.id === "soc2-audit") status = "ready";
      else if (item.id === "soc2-access") status = "partial";
    }

    if (sso && item.id === "soc2-access") status = "ready";

    return { ...item, status };
  });
}

export function getComplianceScore(items: ComplianceChecklistItem[]): number {
  if (items.length === 0) return 0;
  const scores = { ready: 100, partial: 50, pending: 0 };
  const total = items.reduce((sum, i) => sum + scores[i.status], 0);
  return Math.round(total / items.length);
}

export function filterByFramework(
  items: ComplianceChecklistItem[],
  framework: ComplianceFramework
): ComplianceChecklistItem[] {
  return items.filter((i) => i.framework === framework);
}
