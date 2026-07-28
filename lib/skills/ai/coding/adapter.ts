/** ForgeOS AI coding capability — adapter via AI Runtime (RC4.7). */

import { CODING_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(CODING_CONFIG);
export const routeViaAdapter = buildAdapter(CODING_CONFIG, mockExecutor);
