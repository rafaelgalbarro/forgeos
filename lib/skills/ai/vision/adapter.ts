/** ForgeOS AI vision capability — adapter via AI Runtime (RC4.7). */

import { VISION_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(VISION_CONFIG);
export const routeViaAdapter = buildAdapter(VISION_CONFIG, mockExecutor);
