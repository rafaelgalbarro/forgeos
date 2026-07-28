/** ForgeOS AI rag capability — policies (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(RAG_CONFIG);
