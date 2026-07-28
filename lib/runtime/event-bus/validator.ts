/** ForgeOS Runtime Event Bus — payload validators (Epic 4.0). */

import { getEventDefinition, isRegisteredEventType } from "./registry";
import type { PublishInput, RuntimeEventType } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function requireString(obj: Record<string, unknown>, key: string, errors: string[]): void {
  if (!hasNonEmptyString(obj[key])) {
    errors.push(`Missing or empty field: ${key}`);
  }
}

function validateVentureId(obj: Record<string, unknown>, errors: string[]): void {
  requireString(obj, "ventureId", errors);
}

function validatePayloadByType(type: RuntimeEventType, payload: unknown): ValidationResult {
  const errors: string[] = [];

  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, errors: ["Payload must be a non-null object"] };
  }

  const obj = payload as Record<string, unknown>;

  switch (type) {
    case "VENTURE_CREATED":
      requireString(obj, "ventureId", errors);
      requireString(obj, "name", errors);
      break;
    case "DISCOVERY_COMPLETED":
    case "RESEARCH_COMPLETED":
      validateVentureId(obj, errors);
      requireString(obj, "stage", errors);
      break;
    case "CEO_DECISION_CREATED":
      validateVentureId(obj, errors);
      requireString(obj, "decisionId", errors);
      requireString(obj, "title", errors);
      requireString(obj, "recommendation", errors);
      break;
    case "BOARD_CONSENSUS_REACHED":
      validateVentureId(obj, errors);
      requireString(obj, "consensusId", errors);
      requireString(obj, "level", errors);
      requireString(obj, "finalDecision", errors);
      if (typeof obj.confidence !== "number") {
        errors.push("Missing or invalid field: confidence (number)");
      }
      break;
    case "VENTURE_APPROVED":
      validateVentureId(obj, errors);
      requireString(obj, "approvedBy", errors);
      break;
    case "BUILD_REQUESTED":
      validateVentureId(obj, errors);
      requireString(obj, "requestedBy", errors);
      break;
    case "BUILD_COMPLETED":
      validateVentureId(obj, errors);
      requireString(obj, "buildId", errors);
      if (obj.status !== "success" && obj.status !== "partial" && obj.status !== "failed") {
        errors.push("Invalid field: status (success | partial | failed)");
      }
      break;
    case "MEMORY_UPDATED":
      requireString(obj, "memoryId", errors);
      requireString(obj, "memoryType", errors);
      if (obj.action !== "created" && obj.action !== "updated" && obj.action !== "archived") {
        errors.push("Invalid field: action (created | updated | archived)");
      }
      break;
    case "RISK_DETECTED":
      validateVentureId(obj, errors);
      requireString(obj, "riskId", errors);
      requireString(obj, "title", errors);
      if (
        obj.severity !== "low" &&
        obj.severity !== "medium" &&
        obj.severity !== "high" &&
        obj.severity !== "critical"
      ) {
        errors.push("Invalid field: severity (low | medium | high | critical)");
      }
      break;
    case "OPPORTUNITY_DETECTED":
      validateVentureId(obj, errors);
      requireString(obj, "opportunityId", errors);
      requireString(obj, "title", errors);
      if (obj.impact !== "low" && obj.impact !== "medium" && obj.impact !== "high") {
        errors.push("Invalid field: impact (low | medium | high)");
      }
      break;
    case "VENTURE_STATE_CHANGED":
      validateVentureId(obj, errors);
      requireString(obj, "from", errors);
      requireString(obj, "to", errors);
      requireString(obj, "reason", errors);
      requireString(obj, "triggeredBy", errors);
      break;
    case "VENTURE_BLOCKED":
    case "VENTURE_PAUSED":
    case "VENTURE_READY_FOR_BUILD":
    case "VENTURE_READY_FOR_LAUNCH":
    case "VENTURE_READY_FOR_CAPITAL":
      validateVentureId(obj, errors);
      requireString(obj, "state", errors);
      requireString(obj, "reason", errors);
      requireString(obj, "triggeredBy", errors);
      break;
    case "WORKER_REGISTERED":
      requireString(obj, "workerId", errors);
      requireString(obj, "name", errors);
      requireString(obj, "department", errors);
      requireString(obj, "version", errors);
      break;
    case "WORKER_STARTED":
      requireString(obj, "workerId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "taskType", errors);
      requireString(obj, "taskId", errors);
      break;
    case "WORKER_COMPLETED":
      requireString(obj, "workerId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "taskType", errors);
      requireString(obj, "taskId", errors);
      if (typeof obj.durationMs !== "number") {
        errors.push("Missing or invalid field: durationMs (number)");
      }
      break;
    case "WORKER_FAILED":
      requireString(obj, "workerId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "taskType", errors);
      requireString(obj, "taskId", errors);
      requireString(obj, "error", errors);
      if (typeof obj.durationMs !== "number") {
        errors.push("Missing or invalid field: durationMs (number)");
      }
      break;
    case "WORKER_BLOCKED":
    case "WORKER_PAUSED":
    case "WORKER_RESUMED":
      requireString(obj, "workerId", errors);
      requireString(obj, "from", errors);
      requireString(obj, "to", errors);
      requireString(obj, "reason", errors);
      break;
    case "WORKER_HEALTH_CHANGED":
      requireString(obj, "workerId", errors);
      requireString(obj, "from", errors);
      requireString(obj, "to", errors);
      requireString(obj, "reason", errors);
      break;
    case "TASK_CREATED":
    case "TASK_READY":
    case "TASK_STARTED":
    case "TASK_COMPLETED":
    case "TASK_FAILED":
    case "TASK_RETRY":
    case "TASK_CANCELLED":
    case "TASK_DEAD_LETTER":
    case "TASK_TIMEOUT":
      requireString(obj, "taskId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "taskType", errors);
      requireString(obj, "priority", errors);
      requireString(obj, "status", errors);
      break;
    case "EXECUTION_STARTED":
    case "EXECUTION_FINISHED":
    case "EXECUTION_FAILED":
      requireString(obj, "sessionId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "taskId", errors);
      requireString(obj, "workerId", errors);
      requireString(obj, "pipelineState", errors);
      break;
    case "WORKER_DISPATCHED":
      requireString(obj, "workerId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "taskId", errors);
      requireString(obj, "taskType", errors);
      requireString(obj, "sessionId", errors);
      requireString(obj, "reason", errors);
      break;
    case "TASK_EXECUTED":
      requireString(obj, "taskId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "taskType", errors);
      requireString(obj, "workerId", errors);
      requireString(obj, "sessionId", errors);
      if (typeof obj.success !== "boolean") {
        errors.push("Missing or invalid field: success (boolean)");
      }
      if (typeof obj.durationMs !== "number") {
        errors.push("Missing or invalid field: durationMs (number)");
      }
      break;
    case "SESSION_CREATED":
    case "SESSION_FINISHED":
      requireString(obj, "sessionId", errors);
      validateVentureId(obj, errors);
      requireString(obj, "workerId", errors);
      requireString(obj, "taskId", errors);
      requireString(obj, "status", errors);
      break;
    default:
      errors.push(`No validator for event type: ${type}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validatePublishInput<T extends RuntimeEventType>(
  input: PublishInput<T>,
): ValidationResult {
  const errors: string[] = [];

  if (!isRegisteredEventType(input.type)) {
    errors.push(`Unknown event type: ${input.type}`);
    return { valid: false, errors };
  }

  if (!hasNonEmptyString(input.source)) {
    errors.push("Missing or empty field: source");
  }

  const payloadResult = validatePayloadByType(input.type, input.payload);
  errors.push(...payloadResult.errors);

  return { valid: errors.length === 0, errors };
}

export function assertValidPublishInput<T extends RuntimeEventType>(
  input: PublishInput<T>,
): void {
  const result = validatePublishInput(input);
  if (!result.valid) {
    throw new Error(`Invalid runtime event: ${result.errors.join("; ")}`);
  }
}

/** Ensures registry metadata exists for a type (used in tests). */
export function validateRegistryCoverage(): ValidationResult {
  const errors: string[] = [];
  const types = [
    "VENTURE_CREATED",
    "DISCOVERY_COMPLETED",
    "RESEARCH_COMPLETED",
    "CEO_DECISION_CREATED",
    "BOARD_CONSENSUS_REACHED",
    "VENTURE_APPROVED",
    "BUILD_REQUESTED",
    "BUILD_COMPLETED",
    "MEMORY_UPDATED",
    "RISK_DETECTED",
    "OPPORTUNITY_DETECTED",
    "VENTURE_STATE_CHANGED",
    "VENTURE_BLOCKED",
    "VENTURE_PAUSED",
    "VENTURE_READY_FOR_BUILD",
    "VENTURE_READY_FOR_LAUNCH",
    "VENTURE_READY_FOR_CAPITAL",
    "WORKER_REGISTERED",
    "WORKER_STARTED",
    "WORKER_COMPLETED",
    "WORKER_FAILED",
    "WORKER_BLOCKED",
    "WORKER_PAUSED",
    "WORKER_RESUMED",
    "WORKER_HEALTH_CHANGED",
    "TASK_CREATED",
    "TASK_READY",
    "TASK_STARTED",
    "TASK_COMPLETED",
    "TASK_FAILED",
    "TASK_RETRY",
    "TASK_CANCELLED",
    "TASK_DEAD_LETTER",
    "TASK_TIMEOUT",
    "EXECUTION_STARTED",
    "EXECUTION_FINISHED",
    "EXECUTION_FAILED",
    "WORKER_DISPATCHED",
    "TASK_EXECUTED",
    "SESSION_CREATED",
    "SESSION_FINISHED",
  ] as const;

  for (const type of types) {
    try {
      getEventDefinition(type);
    } catch {
      errors.push(`Registry missing definition for: ${type}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
