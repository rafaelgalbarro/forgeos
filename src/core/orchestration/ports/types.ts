/** PROGRAM 6030 — Kernel ports (no parallel runtimes). */

import type { CapabilityRequest, CapabilityResult } from "../../domain/capabilities";
import type { KernelEvent } from "./kernel-events";
import type { ConcurrencyLimits, WorkflowNode } from "../types";

export interface EventBusPort {
  publishDomainEvent(event: KernelEvent): void;
  getHistory(limit?: number): KernelEvent[];
}

export interface SchedulerPort {
  scheduleNode(missionId: string, node: WorkflowNode): Promise<{ taskId: string }>;
  cancelMissionTasks(missionId: string): Promise<void>;
}

export interface RuntimePort {
  executeScheduled(taskId: string, work: () => Promise<CapabilityResult>): Promise<CapabilityResult>;
  isAvailable(): boolean;
}

export interface CapabilityResolverPort {
  resolve(request: CapabilityRequest): Promise<CapabilityResult>;
  isCapabilityAvailable(name: CapabilityRequest["capability"]): boolean;
}

export interface ParallelismPort {
  canRunParallel(nodeIds: string[], limits: ConcurrencyLimits): boolean;
  reserve(nodeId: string): void;
  release(nodeId: string): void;
  activeCount(): number;
  cancelAll(): void;
}

export interface KernelPorts {
  events: EventBusPort;
  scheduler: SchedulerPort;
  runtime: RuntimePort;
  capabilities: CapabilityResolverPort;
  parallelism: ParallelismPort;
}
