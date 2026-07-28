/** PROGRAM 6030 — Dependency helpers. */

import type { WorkflowNode } from "../types";

export function areNodeDependenciesSatisfied(
  node: WorkflowNode,
  statusById: Map<string, WorkflowNode["status"]>,
): boolean {
  return node.dependencies.every((dep) => {
    const st = statusById.get(dep);
    return st === "completed" || st === "skipped";
  });
}

export function getBlockedReason(
  node: WorkflowNode,
  statusById: Map<string, WorkflowNode["status"]>,
): string | null {
  const unmet = node.dependencies.filter((dep) => {
    const st = statusById.get(dep);
    return st !== "completed" && st !== "skipped";
  });
  if (!unmet.length) return null;
  return `Waiting on: ${unmet.join(", ")}`;
}

export function collectDependents(nodeId: string, nodes: WorkflowNode[]): string[] {
  const result = new Set<string>();
  let changed = true;
  result.add(nodeId);
  while (changed) {
    changed = false;
    for (const n of nodes) {
      if (result.has(n.nodeId)) continue;
      if (n.dependencies.some((d) => result.has(d))) {
        result.add(n.nodeId);
        changed = true;
      }
    }
  }
  result.delete(nodeId);
  return [...result];
}
