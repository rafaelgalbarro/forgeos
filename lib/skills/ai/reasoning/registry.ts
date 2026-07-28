/** ForgeOS AI reasoning capability — registry (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(REASONING_CONFIG);
