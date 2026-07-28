/** Analytics Reports — provider module (RC4.6). */

import { createAnalyticsProviderModule } from "../shared/provider-kit";
import { REPORTS_DEF } from "./types";
import { REPORTS_REGISTRY } from "./registry";
import { REPORTS_PERMISSIONS } from "./permissions";
import { REPORTS_POLICIES } from "./policies";
import { assessREPORTSRisk } from "./risk";
import { REPORTS_ROLLBACK } from "./rollback";
import { executeREPORTSMock } from "./mock-executor";
import { REPORTS_SANDBOX } from "./sandbox";
import { executeREPORTSViaRuntime } from "./adapter";

const base = createAnalyticsProviderModule(REPORTS_DEF);

export const reportsModule = {
  ...base,
  registry: REPORTS_REGISTRY,
  permissions: REPORTS_PERMISSIONS,
  policies: REPORTS_POLICIES,
  assessActionRisk: assessREPORTSRisk,
  buildRollback: () => REPORTS_ROLLBACK,
  executeMock: executeREPORTSMock,
  sandbox: REPORTS_SANDBOX,
  executeViaRuntime: executeREPORTSViaRuntime,
};

export * from "./types";
export { REPORTS_REGISTRY } from "./registry";
export { REPORTS_PERMISSIONS } from "./permissions";
export { REPORTS_POLICIES } from "./policies";
export { assessREPORTSRisk } from "./risk";
export { REPORTS_ROLLBACK } from "./rollback";
export { executeREPORTSMock } from "./mock-executor";
export { REPORTS_SANDBOX } from "./sandbox";
export { executeREPORTSViaRuntime } from "./adapter";
