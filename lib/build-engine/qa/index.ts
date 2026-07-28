import type { BuildQueueItem } from "../types";

export interface QaReport {
  ventureId: string;
  passed: number;
  failed: number;
  pending: number;
  status: "pass" | "fail" | "pending";
}

export function runQaAssessment(item: BuildQueueItem): QaReport {
  const artifacts = item.artifacts.filter((a) => a.type === "Testing" || a.type === "Frontend" || a.type === "Backend");
  const passed = artifacts.filter((a) => a.status === "generated").length;
  const pending = artifacts.filter((a) => a.status === "draft").length;
  const failed = artifacts.filter((a) => a.status === "ready").length;

  let status: QaReport["status"] = "pending";
  if (passed > 0 && pending === 0) status = "pass";
  if (failed > passed) status = "fail";

  return {
    ventureId: item.ventureId,
    passed,
    failed,
    pending,
    status,
  };
}
