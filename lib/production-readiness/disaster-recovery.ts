/** Program 6500 — Disaster recovery plan stub */

import type { DisasterRecoveryPlan } from "./types";

const DR_PLAN: DisasterRecoveryPlan = {
  id: "forgeos-primary",
  name: "Plan DR ForgeOS Primary",
  rtoMinutes: 60,
  rpoMinutes: 15,
  status: "draft",
};

export function getDisasterRecoveryPlan(): DisasterRecoveryPlan {
  return DR_PLAN;
}

export function listDisasterRecoveryPlans(): DisasterRecoveryPlan[] {
  return [DR_PLAN];
}

export function runDrTestStub(): DisasterRecoveryPlan {
  return {
    ...DR_PLAN,
    status: "tested",
    lastTestAt: new Date().toISOString(),
  };
}
