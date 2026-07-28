/** ForgeOS AI video capability — registry (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(VIDEO_CONFIG);
