/** ForgeOS AI memory capability — sandbox (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(MEMORY_CONFIG);
