/** Company management events — wired to live-mission event-emitter. */

import type { Mission } from "../types";
import { emitMissionEvent } from "../live-mission/event-emitter";

export function emitCompanyFeedbackUpdate(mission: Mission, label: string): Mission {
  return emitMissionEvent(mission, "company_feedback", label, {
    phase: mission.phase,
    icon: "💬",
    department: "CS",
    metadata: { domain: "customerFeedback" },
  });
}

export function emitCompanyIncidentUpdate(mission: Mission, label: string): Mission {
  return emitMissionEvent(mission, "company_incident", label, {
    phase: mission.phase,
    icon: "🚨",
    department: "Ops",
    metadata: { domain: "incidents" },
  });
}

export function emitCompanyKpiUpdate(mission: Mission, label: string): Mission {
  return emitMissionEvent(mission, "company_kpi", label, {
    phase: mission.phase,
    icon: "📊",
    department: "CEO",
    metadata: { domain: "kpis" },
  });
}
