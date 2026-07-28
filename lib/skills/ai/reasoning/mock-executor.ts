/** ForgeOS AI reasoning capability — mock executor (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(REASONING_CONFIG);
