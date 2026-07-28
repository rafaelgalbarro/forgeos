/** ForgeOS AI video capability — sandbox (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(VIDEO_CONFIG);
