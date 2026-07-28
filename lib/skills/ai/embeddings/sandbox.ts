/** ForgeOS AI embeddings capability — sandbox (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(EMBEDDINGS_CONFIG);
