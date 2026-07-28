/** ForgeOS AI memory capability — registry (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(MEMORY_CONFIG);
