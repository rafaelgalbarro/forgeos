/** ForgeOS AI ocr capability — module entry (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { createAICapabilityModule } from "../shared/capability-factory";

export const module = createAICapabilityModule(OCR_CONFIG);
export { registry } from "./registry";
export { permissions } from "./permissions";
export { policies } from "./policies";
export { assessRisk } from "./risk";
export { buildRollback } from "./rollback";
export { executeMock } from "./mock-executor";
export { sandbox } from "./sandbox";
export { routeViaAdapter } from "./adapter";
export { OCR_CONFIG } from "../shared/capabilities";
