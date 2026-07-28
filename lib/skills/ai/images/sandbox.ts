/** ForgeOS AI images capability — sandbox (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(IMAGES_CONFIG);
