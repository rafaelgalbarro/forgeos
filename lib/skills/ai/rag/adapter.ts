/** ForgeOS AI rag capability — adapter via AI Runtime (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(RAG_CONFIG);
export const routeViaAdapter = buildAdapter(RAG_CONFIG, mockExecutor);
