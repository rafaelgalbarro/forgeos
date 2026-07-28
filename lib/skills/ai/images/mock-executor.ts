/** ForgeOS AI images capability — mock executor (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(IMAGES_CONFIG);
