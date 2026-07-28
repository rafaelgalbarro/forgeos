/** Analytics Dashboards — provider module (RC4.6). */

import { createAnalyticsProviderModule } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";
import { DASHBOARDS_REGISTRY } from "./registry";
import { DASHBOARDS_PERMISSIONS } from "./permissions";
import { DASHBOARDS_POLICIES } from "./policies";
import { assessDASHBOARDSRisk } from "./risk";
import { DASHBOARDS_ROLLBACK } from "./rollback";
import { executeDASHBOARDSMock } from "./mock-executor";
import { DASHBOARDS_SANDBOX } from "./sandbox";
import { executeDASHBOARDSViaRuntime } from "./adapter";

const base = createAnalyticsProviderModule(DASHBOARDS_DEF);

export const dashboardsModule = {
  ...base,
  registry: DASHBOARDS_REGISTRY,
  permissions: DASHBOARDS_PERMISSIONS,
  policies: DASHBOARDS_POLICIES,
  assessActionRisk: assessDASHBOARDSRisk,
  buildRollback: () => DASHBOARDS_ROLLBACK,
  executeMock: executeDASHBOARDSMock,
  sandbox: DASHBOARDS_SANDBOX,
  executeViaRuntime: executeDASHBOARDSViaRuntime,
};

export * from "./types";
export { DASHBOARDS_REGISTRY } from "./registry";
export { DASHBOARDS_PERMISSIONS } from "./permissions";
export { DASHBOARDS_POLICIES } from "./policies";
export { assessDASHBOARDSRisk } from "./risk";
export { DASHBOARDS_ROLLBACK } from "./rollback";
export { executeDASHBOARDSMock } from "./mock-executor";
export { DASHBOARDS_SANDBOX } from "./sandbox";
export { executeDASHBOARDSViaRuntime } from "./adapter";
