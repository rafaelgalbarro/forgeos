/** ForgeOS Execution Engine — in-memory memory adapter (Epic 4.5). */

export interface ExecutionMemoryWrite {
  id: string;
  ventureId: string;
  sessionId: string;
  workerId: string;
  taskId: string;
  memoryType: string;
  action: "created" | "updated";
  summary: string;
  timestamp: string;
}

const memoryStore: ExecutionMemoryWrite[] = [];

export function writeExecutionMemory(params: {
  ventureId: string;
  sessionId: string;
  workerId: string;
  taskId: string;
  memoryType: string;
  summary: string;
  action?: "created" | "updated";
}): ExecutionMemoryWrite {
  const entry: ExecutionMemoryWrite = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ventureId: params.ventureId,
    sessionId: params.sessionId,
    workerId: params.workerId,
    taskId: params.taskId,
    memoryType: params.memoryType,
    action: params.action ?? "created",
    summary: params.summary,
    timestamp: new Date().toISOString(),
  };
  memoryStore.unshift(entry);
  if (memoryStore.length > 500) memoryStore.length = 500;
  return entry;
}

export function getExecutionMemoryWrites(
  ventureId?: string,
  limit = 50,
): ExecutionMemoryWrite[] {
  const list = ventureId
    ? memoryStore.filter((m) => m.ventureId === ventureId)
    : memoryStore;
  return list.slice(0, limit);
}

export function clearExecutionMemory(): void {
  memoryStore.length = 0;
}
