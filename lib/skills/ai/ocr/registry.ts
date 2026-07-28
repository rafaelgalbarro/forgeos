/** ForgeOS AI ocr capability — registry (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { buildRegistry } from "../shared/capability-factory";

export const registry = buildRegistry(OCR_CONFIG);
