/** ForgeOS AI vision capability — mock executor (RC4.7). */

import { VISION_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(VISION_CONFIG);
