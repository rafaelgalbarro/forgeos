/** ForgeOS RC6.5 — cross-department coordinator. */

import type { DepartmentId } from "./types";
import { recordDelegation } from "./organization-memory";
import { getAvailableCapacity } from "./department-runtime";

export interface DelegationPlan {
  id: string;
  from: DepartmentId;
  to: DepartmentId;
  task: string;
  reason: string;
}

const AUTO_DELEGATIONS: DelegationPlan[] = [
  {
    id: "del-1",
    from: "research",
    to: "product",
    task: "Validar vertical SaaS B2B con PRD draft",
    reason: "Oportunidad detectada anoche — Product tiene capacidad",
  },
  {
    id: "del-2",
    from: "qa",
    to: "build",
    task: "Smoke test nocturno en rutas /live y /organization",
    reason: "Riesgo high en regresiones — Build pipeline disponible",
  },
  {
    id: "del-3",
    from: "marketing",
    to: "growth",
    task: "Activar loop referidos post-campaña",
    reason: "Campaña completada — Growth con 35% capacidad libre",
  },
];

export function getAutoDelegationPlan(): DelegationPlan[] {
  const capacity = getAvailableCapacity();
  return AUTO_DELEGATIONS.filter((d) => {
    const target = capacity.find((c) => c.departmentId === d.to);
    return (target?.availablePercent ?? 0) > 10;
  });
}

export function applyAutoDelegations(): DelegationPlan[] {
  const plan = getAutoDelegationPlan();
  for (const d of plan) {
    recordDelegation(d.from, d.to, d.task);
  }
  return plan;
}

export function coordinateDepartments(): {
  delegations: DelegationPlan[];
  syncedAt: string;
} {
  return {
    delegations: getAutoDelegationPlan(),
    syncedAt: new Date().toISOString(),
  };
}
