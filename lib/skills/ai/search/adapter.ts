/** ForgeOS AI search capability — adapter via AI Runtime (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(SEARCH_CONFIG);
export const routeViaAdapter = buildAdapter(SEARCH_CONFIG, mockExecutor);
