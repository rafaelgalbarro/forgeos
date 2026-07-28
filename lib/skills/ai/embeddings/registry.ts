/** ForgeOS AI embeddings capability — registry (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(EMBEDDINGS_CONFIG);
