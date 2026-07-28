/** Executive Intelligence Mesh — Disagreement / Debate Engine (RC3.5). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import type { MeshDebate, MeshDebateArgument, MeshDepartmentId } from "../types";

function readDebates(): MeshDebate[] {
  return readStorage<MeshDebate[]>(STORAGE_KEYS.executiveMeshDebates, []);
}

function writeDebates(debates: MeshDebate[]): void {
  writeStorage(STORAGE_KEYS.executiveMeshDebates, debates.slice(0, 200));
}

export function createDebate(params: {
  topic: string;
  participants: MeshDepartmentId[];
  initialArguments?: MeshDebateArgument[];
}): MeshDebate {
  const debate: MeshDebate = {
    id: crypto.randomUUID(),
    topic: params.topic,
    participants: params.participants,
    arguments: params.initialArguments ?? [],
    status: "open",
    escalatedToCeo: false,
    createdAt: new Date().toISOString(),
  };
  const debates = readDebates();
  debates.unshift(debate);
  writeDebates(debates);
  return debate;
}

export function registerDebateArgument(
  debateId: string,
  argument: MeshDebateArgument
): MeshDebate | null {
  const debates = readDebates();
  const idx = debates.findIndex((d) => d.id === debateId);
  if (idx < 0) return null;

  const debate = debates[idx]!;
  debate.arguments.push(argument);

  const hasConflict = detectDisagreement(debate.arguments);
  if (hasConflict && !debate.escalatedToCeo) {
    debate.status = "escalated";
    debate.escalatedToCeo = true;
  }

  if (argument.needsMoreInfo) {
    debate.status = "open";
  }

  debates[idx] = debate;
  writeDebates(debates);
  return debate;
}

function detectDisagreement(args: MeshDebateArgument[]): boolean {
  if (args.length < 2) return false;
  const positions = args.map((a) => a.position.toLowerCase());
  const approve = positions.filter((p) => p.includes("approve") || p.includes("sí") || p.includes("proceed")).length;
  const reject = positions.filter((p) => p.includes("reject") || p.includes("no") || p.includes("stop")).length;
  return approve > 0 && reject > 0;
}

export function resolveDebateWithCeo(debateId: string, resolution: string): MeshDebate | null {
  const debates = readDebates();
  const idx = debates.findIndex((d) => d.id === debateId);
  if (idx < 0) return null;

  debates[idx] = {
    ...debates[idx]!,
    status: "resolved",
    resolution,
    escalatedToCeo: true,
  };
  writeDebates(debates);
  return debates[idx]!;
}

export function getOpenDebates(): MeshDebate[] {
  return readDebates().filter((d) => d.status !== "resolved");
}

export function getAllDebates(): MeshDebate[] {
  return readDebates();
}

export function buildDebateFromDisagreement(
  topic: string,
  deptA: MeshDepartmentId,
  positionA: string,
  deptB: MeshDepartmentId,
  positionB: string
): MeshDebate {
  return createDebate({
    topic,
    participants: [deptA, deptB, "ceo"],
    initialArguments: [
      {
        departmentId: deptA,
        position: positionA,
        argumentsFor: [positionA],
        argumentsAgainst: [positionB],
        confidence: 0.75,
        needsMoreInfo: false,
      },
      {
        departmentId: deptB,
        position: positionB,
        argumentsFor: [positionB],
        argumentsAgainst: [positionA],
        confidence: 0.72,
        needsMoreInfo: false,
      },
    ],
  });
}
