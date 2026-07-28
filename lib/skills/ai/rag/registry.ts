/** ForgeOS AI rag capability — registry (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(RAG_CONFIG);
