/** ForgeOS AI video capability — mock executor (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(VIDEO_CONFIG);
