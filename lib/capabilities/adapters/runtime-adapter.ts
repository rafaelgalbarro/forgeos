/** ForgeOS Capability Layer — adapters: runtime (RC4.9). */

export interface CapabilityRuntimeDispatch {
  runtimeSessionId: string;
  dispatched: boolean;
  eventType: string;
  payload: Record<string, unknown>;
}

export function dispatchCapabilityToRuntime(params: {
  capabilityId: string;
  ventureId: string;
  requestId: string;
  action: string;
  skillIds: string[];
}): CapabilityRuntimeDispatch {
  const sessionId = `cap-runtime-${Date.now()}-${params.capabilityId}`;
  return {
    runtimeSessionId: sessionId,
    dispatched: true,
    eventType: "CAPABILITY_EXECUTION_PLANNED",
    payload: {
      capabilityId: params.capabilityId,
      ventureId: params.ventureId,
      requestId: params.requestId,
      action: params.action,
      skillIds: params.skillIds,
      mode: "sandbox",
    },
  };
}
