/** ForgeOS AI Runtime RC6 — MCP placeholder adapter. */

import type { RuntimeProviderId } from "../types";
import {
  AbstractProviderAdapter,
  type ProviderExecuteParams,
  type ProviderExecuteResult,
  type ProviderHealthResult,
} from "./provider-interface";

export class McpProvider extends AbstractProviderAdapter {
  readonly id: RuntimeProviderId = "mcp";
  readonly label = "MCP (Model Context Protocol)";

  isConfigured(): boolean {
    return false;
  }

  async models(): Promise<string[]> {
    return ["mcp-pending"];
  }

  estimateCost(): number {
    return 0;
  }

  estimateLatency(): number {
    return 0;
  }

  async health(): Promise<ProviderHealthResult> {
    return { ok: false, latencyMs: 0, message: "MCP adapter pending — protocol not yet stable" };
  }

  protected async doExecute(_params: ProviderExecuteParams): Promise<ProviderExecuteResult> {
    throw new Error("MCP adapter pending — Model Context Protocol not yet stable");
  }
}
