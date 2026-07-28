/** ForgeOS AI ocr capability — sandbox (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { buildSandboxConfig } from "../shared/capability-factory";

export const sandbox = buildSandboxConfig(OCR_CONFIG);
