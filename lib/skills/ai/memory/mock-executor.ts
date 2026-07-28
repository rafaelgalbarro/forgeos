/** ForgeOS AI memory capability — mock executor (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(MEMORY_CONFIG);
