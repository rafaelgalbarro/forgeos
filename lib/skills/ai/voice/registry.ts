/** ForgeOS AI voice capability — registry (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(VOICE_CONFIG);
