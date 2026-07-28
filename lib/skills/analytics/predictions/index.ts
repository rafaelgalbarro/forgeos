/** Analytics Predictions — provider module (RC4.6). */

import { createAnalyticsProviderModule } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";
import { PREDICTIONS_REGISTRY } from "./registry";
import { PREDICTIONS_PERMISSIONS } from "./permissions";
import { PREDICTIONS_POLICIES } from "./policies";
import { assessPREDICTIONSRisk } from "./risk";
import { PREDICTIONS_ROLLBACK } from "./rollback";
import { executePREDICTIONSMock } from "./mock-executor";
import { PREDICTIONS_SANDBOX } from "./sandbox";
import { executePREDICTIONSViaRuntime } from "./adapter";

const base = createAnalyticsProviderModule(PREDICTIONS_DEF);

export const predictionsModule = {
  ...base,
  registry: PREDICTIONS_REGISTRY,
  permissions: PREDICTIONS_PERMISSIONS,
  policies: PREDICTIONS_POLICIES,
  assessActionRisk: assessPREDICTIONSRisk,
  buildRollback: () => PREDICTIONS_ROLLBACK,
  executeMock: executePREDICTIONSMock,
  sandbox: PREDICTIONS_SANDBOX,
  executeViaRuntime: executePREDICTIONSViaRuntime,
};

export * from "./types";
export { PREDICTIONS_REGISTRY } from "./registry";
export { PREDICTIONS_PERMISSIONS } from "./permissions";
export { PREDICTIONS_POLICIES } from "./policies";
export { assessPREDICTIONSRisk } from "./risk";
export { PREDICTIONS_ROLLBACK } from "./rollback";
export { executePREDICTIONSMock } from "./mock-executor";
export { PREDICTIONS_SANDBOX } from "./sandbox";
export { executePREDICTIONSViaRuntime } from "./adapter";
