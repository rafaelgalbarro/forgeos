/** ForgeOS AI ocr capability — adapter via AI Runtime (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { buildMockExecutor, buildAdapter } from "../shared/capability-factory";

const mockExecutor = buildMockExecutor(OCR_CONFIG);
export const routeViaAdapter = buildAdapter(OCR_CONFIG, mockExecutor);
