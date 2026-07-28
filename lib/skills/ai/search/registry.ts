/** ForgeOS AI search capability — registry (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(SEARCH_CONFIG);
