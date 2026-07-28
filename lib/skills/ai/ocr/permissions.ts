/** ForgeOS AI ocr capability — permissions (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { buildPermissions } from "../shared/capability-factory";

export const permissions = buildPermissions(OCR_CONFIG);
