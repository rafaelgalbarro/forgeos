/** ForgeOS AI embeddings capability — permissions (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(EMBEDDINGS_CONFIG);
