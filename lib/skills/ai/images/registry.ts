/** ForgeOS AI images capability — registry (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(IMAGES_CONFIG);
