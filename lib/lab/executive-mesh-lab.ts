/** Executive Intelligence Mesh — lab runner (RC4). */

import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import { resolveVenture } from "@/lib/venture/resolve-venture";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { getExecutiveGraphForVenture } from "@/lib/ai-orchestration/decision-graph-writer";
import { getSkillHistory, getSkillAuditLogs } from "@/lib/skills";
import {
  MESH_DEPARTMENTS,
  getCollaborationGraph,
  runExecutiveProtocol,
  getMeetings,
  getAllDebates,
  rankDepartmentsByScore,
  meshGetMemoryRecords,
} from "@/lib/executive-mesh";
import type { ExecutiveProtocolResult } from "@/lib/executive-mesh/executive-protocol";

export interface ExecutiveMeshLabResult {
  ventureId: string;
  ventureName: string;
  departmentCount: number;
  protocol: ExecutiveProtocolResult | null;
  collaborationLinks: ReturnType<typeof getCollaborationGraph>;
  meetings: ReturnType<typeof getMeetings>;
  debates: ReturnType<typeof getAllDebates>;
  memory: ReturnType<typeof meshGetMemoryRecords>;
  skillHistory: ReturnType<typeof getSkillHistory>;
  skillAudit: ReturnType<typeof getSkillAuditLogs>;
  decisionGraphNodes: ReturnType<typeof getExecutiveGraphForVenture>;
  topScores: ReturnType<typeof rankDepartmentsByScore>;
  orgChart: typeof MESH_DEPARTMENTS;
  error?: string;
}

export async function runExecutiveMeshLab(): Promise<ExecutiveMeshLabResult> {
  ensureVandlSeeded();
  const venture = resolveVenture(VANDL_VENTURE_ID);

  const base = {
    ventureId: venture?.id ?? VANDL_VENTURE_ID,
    ventureName: venture?.name ?? "VANDL",
    departmentCount: MESH_DEPARTMENTS.length,
    collaborationLinks: getCollaborationGraph(),
    meetings: getMeetings(),
    debates: getAllDebates(),
    memory: meshGetMemoryRecords(venture?.id),
    skillHistory: getSkillHistory(venture?.id),
    skillAudit: getSkillAuditLogs(venture?.id),
    decisionGraphNodes: getExecutiveGraphForVenture(venture?.id ?? VANDL_VENTURE_ID),
    topScores: rankDepartmentsByScore().slice(0, 8),
    orgChart: MESH_DEPARTMENTS,
    protocol: null as ExecutiveProtocolResult | null,
  };

  if (!venture) {
    return { ...base, error: "Venture VANDL not found" };
  }

  try {
    const protocol = await runExecutiveProtocol({
      ventureId: venture.id,
      ventureName: venture.name,
      topic: "Deploy VANDL preview — Executive Protocol RC4",
      urgency: "medium",
    });

    return {
      ...base,
      protocol,
      memory: meshGetMemoryRecords(venture.id),
      skillHistory: getSkillHistory(venture.id),
      skillAudit: getSkillAuditLogs(venture.id),
      decisionGraphNodes: getExecutiveGraphForVenture(venture.id),
    };
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
