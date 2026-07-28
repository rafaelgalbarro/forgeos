/** ForgeOS AI embeddings capability — mock executor (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(EMBEDDINGS_CONFIG);
