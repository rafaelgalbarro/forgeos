/** ForgeOS AI images capability — adapter via AI Runtime (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(IMAGES_CONFIG);
export const routeViaAdapter = buildAdapter(IMAGES_CONFIG, mockExecutor);
