/** ForgeOS Skills Framework — runtime adapter (RC4). */

export interface SkillRuntimeDispatch {
  runtimeSessionId: string;
  dispatched: boolean;
  eventType: string;
  payload: Record<string, unknown>;
}

export function dispatchSkillToRuntime(params: {
  skillId: string;
  ventureId: string;
  executionId: string;
  action: string;
}): SkillRuntimeDispatch {
  const sessionId = `skill-runtime-${Date.now()}-${params.skillId}`;
  return {
    runtimeSessionId: sessionId,
    dispatched: true,
    eventType: "SKILL_EXECUTION_PLANNED",
    payload: {
      skillId: params.skillId,
      ventureId: params.ventureId,
      executionId: params.executionId,
      action: params.action,
      mode: "sandbox",
    },
  };
}
