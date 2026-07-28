/** Retry policies for task queue (Epic 4.4). */

import type { QueueTaskPriority } from "./task-priority";
import { getPriorityMaxRetries } from "./task-priority";

export type RetryPolicyType = "NO_RETRY" | "LINEAR" | "EXPONENTIAL" | "MAX_3" | "MAX_5";

export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelayMs: number;
  backoff: "none" | "linear" | "exponential";
}

export const RETRY_POLICY_CONFIG: Record<RetryPolicyType, RetryPolicyConfig> = {
  NO_RETRY: { maxAttempts: 1, baseDelayMs: 0, backoff: "none" },
  LINEAR: { maxAttempts: 5, baseDelayMs: 5_000, backoff: "linear" },
  EXPONENTIAL: { maxAttempts: 5, baseDelayMs: 2_000, backoff: "exponential" },
  MAX_3: { maxAttempts: 3, baseDelayMs: 3_000, backoff: "linear" },
  MAX_5: { maxAttempts: 5, baseDelayMs: 5_000, backoff: "linear" },
};

export const RETRY_POLICY_LABELS: Record<RetryPolicyType, string> = {
  NO_RETRY: "No retry",
  LINEAR: "Linear backoff",
  EXPONENTIAL: "Exponential backoff",
  MAX_3: "Max 3 attempts",
  MAX_5: "Max 5 attempts",
};

export function resolveMaxRetries(
  policy: RetryPolicyType,
  priority: QueueTaskPriority,
): number {
  const policyMax = RETRY_POLICY_CONFIG[policy].maxAttempts;
  const priorityMax = getPriorityMaxRetries(priority);
  if (policy === "NO_RETRY") return 0;
  if (policy === "MAX_3") return Math.min(3, priorityMax);
  if (policy === "MAX_5") return Math.min(5, priorityMax);
  return Math.min(policyMax, priorityMax);
}

export function computeRetryDelayMs(policy: RetryPolicyType, attemptCount: number): number {
  const config = RETRY_POLICY_CONFIG[policy];
  if (config.backoff === "none") return 0;
  if (config.backoff === "linear") return config.baseDelayMs * attemptCount;
  return config.baseDelayMs * Math.pow(2, attemptCount - 1);
}

export function shouldRetry(
  policy: RetryPolicyType,
  attemptCount: number,
  priority: QueueTaskPriority,
): boolean {
  if (policy === "NO_RETRY") return false;
  const max = resolveMaxRetries(policy, priority);
  return attemptCount < max;
}

export function hasExceededMaxRetries(
  attemptCount: number,
  maxRetries: number,
): boolean {
  return attemptCount >= maxRetries;
}
