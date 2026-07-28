/** ForgeOS AI translation capability — mock executor (RC4.7). */

import { TRANSLATION_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(TRANSLATION_CONFIG);
