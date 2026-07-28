/** ForgeOS AI search capability — mock executor (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(SEARCH_CONFIG);
