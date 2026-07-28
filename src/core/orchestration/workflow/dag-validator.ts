/** PROGRAM 6030 — Workflow DAG validation. */

import type { DagValidationIssue, DagValidationResult, WorkflowNode, WorkflowStage } from "../types";

export function detectCycles(nodes: WorkflowNode[]): string[][] {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[][] = [];

  function dfs(id: string, path: string[]): void {
    if (visiting.has(id)) {
      const idx = path.indexOf(id);
      cycles.push(path.slice(idx).concat(id));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const node = byId.get(id);
    for (const dep of node?.dependencies ?? []) {
      dfs(dep, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const node of nodes) dfs(node.nodeId, []);
  return cycles;
}

export function topologicalSort(nodes: WorkflowNode[]): string[] {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const n of nodes) {
    indegree.set(n.nodeId, 0);
    dependents.set(n.nodeId, []);
  }

  for (const n of nodes) {
    for (const dep of n.dependencies) {
      if (!byId.has(dep)) continue;
      indegree.set(n.nodeId, (indegree.get(n.nodeId) ?? 0) + 1);
      dependents.get(dep)!.push(n.nodeId);
    }
  }

  const queue = [...indegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const order: string[] = [];

  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const child of dependents.get(id) ?? []) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) queue.push(child);
    }
  }

  return order;
}

export function validateWorkflowDag(
  nodes: WorkflowNode[],
  stages: WorkflowStage[],
  availableOutputs: Set<string> = new Set(),
): DagValidationResult {
  const issues: DagValidationIssue[] = [];
  const nodeIds = new Set(nodes.map((n) => n.nodeId));

  const cycles = detectCycles(nodes);
  for (const cycle of cycles) {
    issues.push({
      code: "CYCLE",
      message: `Cycle detected: ${cycle.join(" → ")}`,
      nodeIds: cycle,
    });
  }

  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (!nodeIds.has(dep)) {
        issues.push({
          code: "MISSING_DEPENDENCY",
          message: `Node ${node.nodeId} depends on missing ${dep}`,
          nodeIds: [node.nodeId, dep],
        });
      }
    }

    for (const ref of node.inputReferences) {
      if (ref.startsWith("output:") && availableOutputs.size > 0 && !availableOutputs.has(ref.slice(7))) {
        issues.push({
          code: "UNAVAILABLE_OUTPUT",
          message: `Node ${node.nodeId} requires unavailable output ${ref}`,
          nodeIds: [node.nodeId],
        });
      }
    }
  }

  for (const stage of stages) {
    const missing = stage.nodeIds.filter((id) => !nodeIds.has(id));
    if (missing.length) {
      issues.push({
        code: "IMPOSSIBLE_STAGE",
        message: `Stage ${stage.stageId} references missing nodes: ${missing.join(", ")}`,
        nodeIds: missing,
      });
    }
  }

  const runningLike = nodes.filter((n) => n.status === "running");
  const conflictGroups = new Map<string, string[]>();
  for (const n of runningLike) {
    const key = n.capability ?? n.type;
    const list = conflictGroups.get(key) ?? [];
    list.push(n.nodeId);
    conflictGroups.set(key, list);
  }
  for (const [key, ids] of conflictGroups) {
    if (ids.length > 1 && (key === "DeployRelease" || key === "DEPLOY")) {
      issues.push({
        code: "EXECUTION_CONFLICT",
        message: `Conflicting concurrent deployments: ${ids.join(", ")}`,
        nodeIds: ids,
      });
    }
  }

  const topologicalOrder = issues.some((i) => i.code === "CYCLE")
    ? []
    : topologicalSort(nodes);

  if (!issues.some((i) => i.code === "CYCLE") && topologicalOrder.length !== nodes.length) {
    issues.push({
      code: "CYCLE",
      message: "Topological sort incomplete — residual cycle or broken edges",
      nodeIds: nodes.map((n) => n.nodeId).filter((id) => !topologicalOrder.includes(id)),
    });
  }

  return { ok: issues.length === 0, issues, topologicalOrder };
}

export function getReadyNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  const statusById = new Map(nodes.map((n) => [n.nodeId, n.status]));
  return nodes.filter((node) => {
    if (node.status !== "pending" && node.status !== "ready") return false;
    return node.dependencies.every((dep) => {
      const st = statusById.get(dep);
      return st === "completed" || st === "skipped";
    });
  });
}
