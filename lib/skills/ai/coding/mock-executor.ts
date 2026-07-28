/** ForgeOS AI coding capability — mock executor (RC4.7). */

import { CODING_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(CODING_CONFIG);
