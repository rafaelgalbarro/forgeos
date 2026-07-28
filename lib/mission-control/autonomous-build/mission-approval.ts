/** Detect gate conditions, surface approval UI, resume on approve. */

import type { AutonomousState, ApprovalGate } from "./types";
import type { Mission } from "../types";
import { createApprovalGate, detectApprovalReason } from "./approval-gates";
import { pauseAutonomous } from "./mission-pause";
import { emitAutonomousMissionEvent } from "../live-mission/event-emitter";
import { linkApprovalToMission } from "../decision-center";

export function checkTaskForApproval(
  mission: Mission,
  state: AutonomousState
): { state: AutonomousState; mission: Mission; gate?: ApprovalGate } {
  const running = state.tasks.find((t) => t.status === "Running");
  if (!running || state.pendingApproval) return { state, mission };

  const reason = detectApprovalReason(running, mission.phase);
  if (!reason) return { state, mission };

  const gate = createApprovalGate(running, reason);
  const paused = pauseAutonomous(mission, state, false);
  const updated: AutonomousState = {
    ...paused.state,
    status: "awaiting_approval",
    pendingApproval: gate,
    updatedAt: new Date().toISOString(),
  };

  let m = emitAutonomousMissionEvent(paused.mission, "approval_required", gate.title, {
    phase: mission.phase,
    metadata: { reason: gate.reason, taskId: gate.taskId },
  });
  m = linkApprovalToMission(m, gate);

  return { state: updated, mission: m, gate };
}

export function resolveApproval(
  mission: Mission,
  state: AutonomousState,
  approved: boolean
): { mission: Mission; state: AutonomousState } {
  const gate = state.pendingApproval;
  if (!gate) return { mission, state };

  const resolved: ApprovalGate = { ...gate, resolved: true, approved };
  let m = emitAutonomousMissionEvent(
    mission,
    "approval_resolved",
    approved ? `Aprobado: ${gate.title}` : `Rechazado: ${gate.title}`,
    { metadata: { reason: gate.reason } }
  );

  if (!approved) {
    return {
      mission: m,
      state: {
        ...state,
        status: "paused",
        pausedByUser: true,
        pendingApproval: resolved,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  return {
    mission: m,
    state: {
      ...state,
      status: "running",
      pendingApproval: undefined,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function formatApprovalQuestion(gate: ApprovalGate): string {
  return `${gate.title}: ${gate.description} (${gate.taskLabel}) — Responde sí o no.`;
}

export { handleApprovalResponse } from "./autonomous-orchestrator";
