/** ForgeOS AI vision capability — registry (RC4.7). */

import { VISION_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(VISION_CONFIG);
