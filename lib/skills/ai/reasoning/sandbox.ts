/** ForgeOS AI reasoning capability — sandbox (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(REASONING_CONFIG);
