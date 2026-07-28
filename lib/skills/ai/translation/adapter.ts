/** ForgeOS AI translation capability — adapter via AI Runtime (RC4.7). */

import { TRANSLATION_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(TRANSLATION_CONFIG);
export const routeViaAdapter = buildAdapter(TRANSLATION_CONFIG, mockExecutor);
