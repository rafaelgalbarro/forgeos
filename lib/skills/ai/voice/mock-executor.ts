/** ForgeOS AI voice capability — mock executor (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(VOICE_CONFIG);
