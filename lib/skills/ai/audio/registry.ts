/** ForgeOS AI audio capability — registry (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(AUDIO_CONFIG);
