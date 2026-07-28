/** Analytics KPIs — provider module (RC4.6). */

import { createAnalyticsProviderModule } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";
import { KPIS_REGISTRY } from "./registry";
import { KPIS_PERMISSIONS } from "./permissions";
import { KPIS_POLICIES } from "./policies";
import { assessKPISRisk } from "./risk";
import { KPIS_ROLLBACK } from "./rollback";
import { executeKPISMock } from "./mock-executor";
import { KPIS_SANDBOX } from "./sandbox";
import { executeKPISViaRuntime } from "./adapter";

const base = createAnalyticsProviderModule(KPIS_DEF);

export const kpisModule = {
  ...base,
  registry: KPIS_REGISTRY,
  permissions: KPIS_PERMISSIONS,
  policies: KPIS_POLICIES,
  assessActionRisk: assessKPISRisk,
  buildRollback: () => KPIS_ROLLBACK,
  executeMock: executeKPISMock,
  sandbox: KPIS_SANDBOX,
  executeViaRuntime: executeKPISViaRuntime,
};

export * from "./types";
export { KPIS_REGISTRY } from "./registry";
export { KPIS_PERMISSIONS } from "./permissions";
export { KPIS_POLICIES } from "./policies";
export { assessKPISRisk } from "./risk";
export { KPIS_ROLLBACK } from "./rollback";
export { executeKPISMock } from "./mock-executor";
export { KPIS_SANDBOX } from "./sandbox";
export { executeKPISViaRuntime } from "./adapter";
