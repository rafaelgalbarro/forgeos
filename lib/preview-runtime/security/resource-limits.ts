/** PROGRAM 5370 — Resource limits for sandboxes. */

export interface ResourceLimits {
  maxCpuPercent: number;
  maxMemoryMb: number;
  maxDurationMs: number;
  maxDiskMb: number;
  maxProcesses: number;
  maxPorts: number;
}

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxCpuPercent: 80,
  maxMemoryMb: 512,
  maxDurationMs: 10 * 60 * 1000,
  maxDiskMb: 256,
  maxProcesses: 8,
  maxPorts: 1,
};

export interface LimitCheckResult {
  exceeded: boolean;
  reason?: string;
  limit?: keyof ResourceLimits;
}

export function checkResourceLimits(
  usage: { elapsedMs: number; memoryMb?: number; processCount?: number; diskMb?: number },
  limits: ResourceLimits = DEFAULT_RESOURCE_LIMITS
): LimitCheckResult {
  if (usage.elapsedMs > limits.maxDurationMs) {
    return { exceeded: true, reason: "Sandbox timeout exceeded", limit: "maxDurationMs" };
  }
  if (usage.memoryMb != null && usage.memoryMb > limits.maxMemoryMb) {
    return { exceeded: true, reason: "Memory limit exceeded", limit: "maxMemoryMb" };
  }
  if (usage.processCount != null && usage.processCount > limits.maxProcesses) {
    return { exceeded: true, reason: "Process limit exceeded", limit: "maxProcesses" };
  }
  if (usage.diskMb != null && usage.diskMb > limits.maxDiskMb) {
    return { exceeded: true, reason: "Disk limit exceeded", limit: "maxDiskMb" };
  }
  return { exceeded: false };
}
