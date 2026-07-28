/** ForgeOS AI embeddings capability — adapter via AI Runtime (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(EMBEDDINGS_CONFIG);
export const routeViaAdapter = buildAdapter(EMBEDDINGS_CONFIG, mockExecutor);
