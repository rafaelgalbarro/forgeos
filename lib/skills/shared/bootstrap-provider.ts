/** Bootstrap a full provider skill module from config (RC4.2). */

import { createProviderModule, type ProviderModuleConfig, type ProviderSkillModule } from "./provider-factory";

export interface BootstrappedProvider {
  module: ProviderSkillModule;
  registry: ProviderSkillModule["registry"];
  permissions: ProviderSkillModule["permissions"];
  policies: ProviderSkillModule["policies"];
  assessActionRisk: ProviderSkillModule["assessActionRisk"];
  buildRollbackPlan: ProviderSkillModule["buildRollbackPlan"];
  telemetryMeta: ProviderSkillModule["telemetryMeta"];
  buildAuditEvent: ProviderSkillModule["buildAuditEvent"];
  executeMock: ProviderSkillModule["executeMock"];
  sandbox: ProviderSkillModule["sandbox"];
  adapter: ProviderSkillModule["adapter"];
}

export function bootstrapProvider(config: ProviderModuleConfig): BootstrappedProvider {
  const module = createProviderModule(config);
  return {
    module,
    registry: module.registry,
    permissions: module.permissions,
    policies: module.policies,
    assessActionRisk: module.assessActionRisk,
    buildRollbackPlan: module.buildRollbackPlan,
    telemetryMeta: module.telemetryMeta,
    buildAuditEvent: module.buildAuditEvent,
    executeMock: module.executeMock,
    sandbox: module.sandbox,
    adapter: module.adapter,
  };
}
