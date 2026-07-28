/** ForgeOS AI rag capability — sandbox (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(RAG_CONFIG);
