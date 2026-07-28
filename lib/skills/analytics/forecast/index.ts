/** Analytics Forecast — provider module (RC4.6). */

import { createAnalyticsProviderModule } from "../shared/provider-kit";
import { FORECAST_DEF } from "./types";
import { FORECAST_REGISTRY } from "./registry";
import { FORECAST_PERMISSIONS } from "./permissions";
import { FORECAST_POLICIES } from "./policies";
import { assessFORECASTRisk } from "./risk";
import { FORECAST_ROLLBACK } from "./rollback";
import { executeFORECASTMock } from "./mock-executor";
import { FORECAST_SANDBOX } from "./sandbox";
import { executeFORECASTViaRuntime } from "./adapter";

const base = createAnalyticsProviderModule(FORECAST_DEF);

export const forecastModule = {
  ...base,
  registry: FORECAST_REGISTRY,
  permissions: FORECAST_PERMISSIONS,
  policies: FORECAST_POLICIES,
  assessActionRisk: assessFORECASTRisk,
  buildRollback: () => FORECAST_ROLLBACK,
  executeMock: executeFORECASTMock,
  sandbox: FORECAST_SANDBOX,
  executeViaRuntime: executeFORECASTViaRuntime,
};

export * from "./types";
export { FORECAST_REGISTRY } from "./registry";
export { FORECAST_PERMISSIONS } from "./permissions";
export { FORECAST_POLICIES } from "./policies";
export { assessFORECASTRisk } from "./risk";
export { FORECAST_ROLLBACK } from "./rollback";
export { executeFORECASTMock } from "./mock-executor";
export { FORECAST_SANDBOX } from "./sandbox";
export { executeFORECASTViaRuntime } from "./adapter";
