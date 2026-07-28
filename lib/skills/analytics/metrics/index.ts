/** Analytics Metrics — provider module (RC4.6). */

import { createAnalyticsProviderModule } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";
import { METRICS_REGISTRY } from "./registry";
import { METRICS_PERMISSIONS } from "./permissions";
import { METRICS_POLICIES } from "./policies";
import { assessMETRICSRisk } from "./risk";
import { METRICS_ROLLBACK } from "./rollback";
import { executeMETRICSMock } from "./mock-executor";
import { METRICS_SANDBOX } from "./sandbox";
import { executeMETRICSViaRuntime } from "./adapter";

const base = createAnalyticsProviderModule(METRICS_DEF);

export const metricsModule = {
  ...base,
  registry: METRICS_REGISTRY,
  permissions: METRICS_PERMISSIONS,
  policies: METRICS_POLICIES,
  assessActionRisk: assessMETRICSRisk,
  buildRollback: () => METRICS_ROLLBACK,
  executeMock: executeMETRICSMock,
  sandbox: METRICS_SANDBOX,
  executeViaRuntime: executeMETRICSViaRuntime,
};

export * from "./types";
export { METRICS_REGISTRY } from "./registry";
export { METRICS_PERMISSIONS } from "./permissions";
export { METRICS_POLICIES } from "./policies";
export { assessMETRICSRisk } from "./risk";
export { METRICS_ROLLBACK } from "./rollback";
export { executeMETRICSMock } from "./mock-executor";
export { METRICS_SANDBOX } from "./sandbox";
export { executeMETRICSViaRuntime } from "./adapter";
