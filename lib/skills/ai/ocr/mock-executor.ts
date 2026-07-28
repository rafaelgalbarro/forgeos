/** ForgeOS AI ocr capability — mock executor (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { buildMockExecutor } from "../shared/capability-factory";

export const executeMock = buildMockExecutor(OCR_CONFIG);
