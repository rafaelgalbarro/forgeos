/** ForgeOS AI voice capability — adapter via AI Runtime (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(VOICE_CONFIG);
export const routeViaAdapter = buildAdapter(VOICE_CONFIG, mockExecutor);
