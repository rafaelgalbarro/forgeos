/** ForgeOS AI embeddings capability — policies (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(EMBEDDINGS_CONFIG);
