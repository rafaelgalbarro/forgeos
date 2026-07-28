/** Executive Mesh — adapter to runtime execution (mock dispatch, no circular import). */

export interface MeshExecutionPlan {
  steps: string[];
  dispatched: boolean;
  runtimeTaskIds: string[];
}

export function meshDispatchExecutionPlan(plan: string[]): MeshExecutionPlan {
  return {
    steps: plan,
    dispatched: true,
    runtimeTaskIds: plan.map((_, i) => `mesh-exec-${Date.now()}-${i}`),
  };
}
