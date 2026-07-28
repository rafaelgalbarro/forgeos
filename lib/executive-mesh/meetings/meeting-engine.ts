/** Executive Intelligence Mesh — Meeting Engine (RC3.5). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import { MESH_DEPARTMENTS, getBoardDepartments } from "../departments";
import type { MeetingType, MeshMeeting, MeshDepartmentId } from "../types";

const MEETING_CONFIG: Record<
  MeetingType,
  { title: string; participants: MeshDepartmentId[]; agendaTemplate: string[] }
> = {
  "daily-executive": {
    title: "Daily Executive",
    participants: ["ceo", "cto", "cpo", "cmo", "cfo", "coo"],
    agendaTemplate: ["Prioridades del día", "Bloqueos", "Decisiones pendientes"],
  },
  "weekly-board": {
    title: "Weekly Board",
    participants: getBoardDepartments().map((d) => d.id),
    agendaTemplate: ["Portfolio review", "Riesgos", "Oportunidades", "Votaciones"],
  },
  "product-review": {
    title: "Product Review",
    participants: ["ceo", "cpo", "product", "ux", "research"],
    agendaTemplate: ["Roadmap", "MVP status", "User feedback"],
  },
  "build-review": {
    title: "Build Review",
    participants: ["cto", "architecture", "backend", "frontend", "qa", "deployment"],
    agendaTemplate: ["Build status", "Artefactos", "Release readiness"],
  },
  "risk-review": {
    title: "Risk Review",
    participants: ["ceo", "cfo", "legal", "security", "coo"],
    agendaTemplate: ["Riesgos activos", "Mitigaciones", "Compliance"],
  },
  "investment-review": {
    title: "Investment Review",
    participants: ["ceo", "cfo", "capital", "finance", "growth"],
    agendaTemplate: ["Runway", "Capital needs", "ROI projections"],
  },
  "deployment-review": {
    title: "Deployment Review",
    participants: ["cto", "deployment", "infrastructure", "qa", "security"],
    agendaTemplate: ["Deploy plan", "Rollback", "Monitoring"],
  },
};

function readMeetings(): MeshMeeting[] {
  return readStorage<MeshMeeting[]>(STORAGE_KEYS.executiveMeshMeetings, []);
}

function writeMeetings(meetings: MeshMeeting[]): void {
  writeStorage(STORAGE_KEYS.executiveMeshMeetings, meetings.slice(0, 100));
}

export function scheduleMeeting(type: MeetingType, ventureTopic?: string): MeshMeeting {
  const config = MEETING_CONFIG[type];
  const meeting: MeshMeeting = {
    id: crypto.randomUUID(),
    type,
    title: config.title,
    agenda: config.agendaTemplate.map((a) =>
      ventureTopic ? `${a} — ${ventureTopic}` : a
    ),
    participants: config.participants,
    arguments: config.participants.slice(0, 4).map((deptId) => {
      const dept = MESH_DEPARTMENTS.find((d) => d.id === deptId)!;
      return {
        departmentId: deptId,
        position: `${dept.label}: perspectiva sobre la agenda`,
        argumentsFor: [`A favor de avanzar en ${dept.specialties[0] ?? "prioridad"}`],
        argumentsAgainst: [],
        confidence: 0.78,
        needsMoreInfo: false,
      };
    }),
    consensus: undefined,
    actions: [],
    followUp: [],
    scheduledAt: new Date().toISOString(),
  };

  const meetings = readMeetings();
  meetings.unshift(meeting);
  writeMeetings(meetings);
  return meeting;
}

export function completeMeeting(
  meetingId: string,
  params: { consensus: string; actions: string[]; followUp: string[] }
): MeshMeeting | null {
  const meetings = readMeetings();
  const idx = meetings.findIndex((m) => m.id === meetingId);
  if (idx < 0) return null;

  meetings[idx] = {
    ...meetings[idx]!,
    consensus: params.consensus,
    actions: params.actions,
    followUp: params.followUp,
    completedAt: new Date().toISOString(),
  };
  writeMeetings(meetings);
  return meetings[idx]!;
}

export function getMeetings(): MeshMeeting[] {
  return readMeetings();
}

export function listMeetingTypes(): MeetingType[] {
  return Object.keys(MEETING_CONFIG) as MeetingType[];
}
