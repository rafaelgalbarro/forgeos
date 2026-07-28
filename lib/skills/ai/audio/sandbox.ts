/** ForgeOS AI audio capability — sandbox (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(AUDIO_CONFIG);
