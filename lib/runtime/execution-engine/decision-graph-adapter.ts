/** ForgeOS Execution Engine — in-memory decision graph adapter (Epic 4.5). */

export interface ExecutionDecisionWrite {
  id: string;
  ventureId: string;
  sessionId: string;
  workerId: string;
  taskId: string;
  nodeType: string;
  title: string;
  rationale: string;
  confidence: number;
  timestamp: string;
}

const decisionStore: ExecutionDecisionWrite[] = [];

export function writeExecutionDecision(params: {
  ventureId: string;
  sessionId: string;
  workerId: string;
  taskId: string;
  nodeType: string;
  title: string;
  rationale: string;
  confidence?: number;
}): ExecutionDecisionWrite {
  const entry: ExecutionDecisionWrite = {
    id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ventureId: params.ventureId,
    sessionId: params.sessionId,
    workerId: params.workerId,
    taskId: params.taskId,
    nodeType: params.nodeType,
    title: params.title,
    rationale: params.rationale,
    confidence: params.confidence ?? 0.75,
    timestamp: new Date().toISOString(),
  };
  decisionStore.unshift(entry);
  if (decisionStore.length > 500) decisionStore.length = 500;
  return entry;
}

export function getExecutionDecisionWrites(
  ventureId?: string,
  limit = 50,
): ExecutionDecisionWrite[] {
  const list = ventureId
    ? decisionStore.filter((d) => d.ventureId === ventureId)
    : decisionStore;
  return list.slice(0, limit);
}

export function clearExecutionDecisions(): void {
  decisionStore.length = 0;
}
