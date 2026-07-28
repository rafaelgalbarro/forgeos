/** ForgeOS AI audio capability — adapter via AI Runtime (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(AUDIO_CONFIG);
export const routeViaAdapter = buildAdapter(AUDIO_CONFIG, mockExecutor);
