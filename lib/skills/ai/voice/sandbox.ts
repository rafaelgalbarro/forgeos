/** ForgeOS AI voice capability — sandbox (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(VOICE_CONFIG);
