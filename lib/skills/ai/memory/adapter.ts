/** ForgeOS AI memory capability — adapter via AI Runtime (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(MEMORY_CONFIG);
export const routeViaAdapter = buildAdapter(MEMORY_CONFIG, mockExecutor);
