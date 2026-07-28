/** ForgeOS AI rag capability — permissions (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(RAG_CONFIG);
