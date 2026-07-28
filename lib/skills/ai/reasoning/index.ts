/** ForgeOS AI reasoning capability — module entry (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { createAICapabilityModule } from "../shared/capability-factory";

export const module = createAICapabilityModule(REASONING_CONFIG);
export { registry } from "./registry";
export { permissions } from "./permissions";
export { policies } from "./policies";
export { assessRisk } from "./risk";
export { buildRollback } from "./rollback";
export { executeMock } from "./mock-executor";
export { sandbox } from "./sandbox";
export { routeViaAdapter } from "./adapter";
export { REASONING_CONFIG } from "../shared/capabilities";
