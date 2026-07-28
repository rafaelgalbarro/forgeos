/** Normalize workflow / lifecycle status labels for Mission Control UI. */

export type McStatusTone =
  | "completed"
  | "executing"
  | "blocked"
  | "waiting"
  | "empty"
  | "partial"
  | "error"
  | "unknown";

const COMPLETED = new Set([
  "completed",
  "complete",
  "done",
  "success",
  "succeeded",
  "ready",
  "delivered",
  "approved",
]);

const EXECUTING = new Set([
  "executing",
  "running",
  "in_progress",
  "in-progress",
  "active",
  "processing",
  "queued",
  "building",
]);

const BLOCKED = new Set(["blocked", "failed", "error", "rejected", "cancelled", "canceled"]);

const WAITING = new Set([
  "waiting",
  "pending",
  "paused",
  "awaiting",
  "awaiting_approval",
  "needs_approval",
]);

const PARTIAL = new Set(["partial", "degraded", "unavailable"]);

const EMPTY = new Set(["empty", "idle", "none", "unknown", ""]);

export function normalizeMcStatus(raw: string | null | undefined): McStatusTone {
  const key = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (EMPTY.has(key)) return key === "" || key === "unknown" ? "unknown" : "empty";
  if (COMPLETED.has(key)) return "completed";
  if (EXECUTING.has(key)) return "executing";
  if (BLOCKED.has(key)) return "blocked";
  if (WAITING.has(key)) return "waiting";
  if (PARTIAL.has(key)) return "partial";
  if (key.includes("fail") || key.includes("error") || key.includes("block")) return "blocked";
  if (key.includes("wait") || key.includes("pend") || key.includes("pause")) return "waiting";
  if (key.includes("run") || key.includes("exec") || key.includes("active")) return "executing";
  if (key.includes("complete") || key.includes("done") || key.includes("success")) return "completed";
  return "unknown";
}

export function mcStatusClass(raw: string | null | undefined): string {
  const tone = normalizeMcStatus(raw);
  return `mc-status mc-status--${tone}`;
}

export function primaryCtaFromVm(input: {
  missionId: string | null;
  availability: string;
  nextAction: string;
  nextDecision: string | null;
}): { label: string; href: string } {
  if (input.availability === "empty" || !input.missionId) {
    return { label: "Create Venture", href: "/os/creator" };
  }
  if (input.nextDecision) {
    return {
      label: "Resolver decisión",
      href: `/missions/${input.missionId}?section=decisions`,
    };
  }
  if (input.availability === "error" || input.availability === "unavailable") {
    return { label: "Reintentar", href: "/mission-control" };
  }
  return {
    label: input.nextAction?.slice(0, 48) || "Continuar misión",
    href: `/mission-control/${input.missionId}`,
  };
}
