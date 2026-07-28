/** ForgeOS AI audio capability — mock executor (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(AUDIO_CONFIG);
