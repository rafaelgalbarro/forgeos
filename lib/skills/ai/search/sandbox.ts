/** ForgeOS AI search capability — sandbox (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(SEARCH_CONFIG);
