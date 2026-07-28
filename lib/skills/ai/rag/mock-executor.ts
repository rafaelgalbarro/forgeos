/** ForgeOS AI rag capability — mock executor (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(RAG_CONFIG);
