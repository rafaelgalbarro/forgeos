/** ForgeOS Productivity Skills — provider module generator (RC4.3). */

import { createProductivityProvider } from "./create-provider";
import type { ProductivityProviderConfig, ProductivityProviderModule } from "./types";

export function buildProviderModule(config: ProductivityProviderConfig): ProductivityProviderModule {
  return createProductivityProvider(config);
}

export function buildProviderFiles(config: ProductivityProviderConfig) {
  const mod = createProductivityProvider(config);
  return {
    types: mod.metadata,
    registry: mod.metadata,
    permissions: mod.permissions,
    policies: mod.policy,
    risk: mod.assessRisk,
    rollback: mod.buildRollback,
    mockExecutor: mod.executeMock,
    sandbox: mod.sandbox,
    adapter: mod.executeViaAdapter,
    module: mod,
  };
}
