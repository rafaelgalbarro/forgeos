/** ForgeOS AI Runtime RC6 — provider adapter interface (decoupled). */

import type { RuntimeProviderId } from "../types";

export interface ProviderExecuteParams {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  requiresJson?: boolean;
  stream?: boolean;
}

export interface ProviderExecuteResult {
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
  latencyMs: number;
}

export interface ProviderHealthResult {
  ok: boolean;
  latencyMs: number;
  message?: string;
}

export interface ProviderTelemetrySnapshot {
  requests: number;
  errors: number;
  retries: number;
  fallbacks: number;
  totalCost: number;
  totalTokens: number;
  cacheHits: number;
}

export interface IProviderAdapter {
  readonly id: RuntimeProviderId;
  readonly label: string;
  connect(): Promise<boolean>;
  health(): Promise<ProviderHealthResult>;
  models(): Promise<string[]>;
  estimateCost(inputTokens: number, outputTokens: number, model?: string): number;
  estimateLatency(model?: string): number;
  execute(params: ProviderExecuteParams): Promise<ProviderExecuteResult>;
  cancel(_requestId: string): Promise<void>;
  retry(params: ProviderExecuteParams, attempt?: number): Promise<ProviderExecuteResult>;
  telemetry(): ProviderTelemetrySnapshot;
  isConfigured(): boolean;
}

export abstract class AbstractProviderAdapter implements IProviderAdapter {
  abstract readonly id: RuntimeProviderId;
  abstract readonly label: string;

  protected stats: ProviderTelemetrySnapshot = {
    requests: 0,
    errors: 0,
    retries: 0,
    fallbacks: 0,
    totalCost: 0,
    totalTokens: 0,
    cacheHits: 0,
  };

  abstract isConfigured(): boolean;
  abstract models(): Promise<string[]>;
  abstract estimateCost(inputTokens: number, outputTokens: number, model?: string): number;
  abstract estimateLatency(model?: string): number;
  protected abstract doExecute(params: ProviderExecuteParams): Promise<ProviderExecuteResult>;

  async connect(): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const h = await this.health();
    return h.ok;
  }

  async health(): Promise<ProviderHealthResult> {
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, message: "Not configured" };
    }
    return { ok: true, latencyMs: this.estimateLatency(), message: "Ready" };
  }

  async execute(params: ProviderExecuteParams): Promise<ProviderExecuteResult> {
    this.stats.requests++;
    const started = Date.now();
    try {
      const result = await this.doExecute(params);
      result.latencyMs = Date.now() - started;
      this.stats.totalCost += result.costEstimate;
      this.stats.totalTokens += result.inputTokens + result.outputTokens;
      return result;
    } catch (err) {
      this.stats.errors++;
      throw err;
    }
  }

  async cancel(): Promise<void> {
    /* fetch-based adapters — no-op cancel */
  }

  async retry(params: ProviderExecuteParams, attempt = 1): Promise<ProviderExecuteResult> {
    this.stats.retries++;
    await new Promise((r) => setTimeout(r, Math.min(attempt * 500, 3000)));
    return this.execute(params);
  }

  telemetry(): ProviderTelemetrySnapshot {
    return { ...this.stats };
  }
}
