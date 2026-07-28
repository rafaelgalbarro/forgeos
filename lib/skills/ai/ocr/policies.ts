/** ForgeOS AI ocr capability — policies (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { buildPolicies } from "../shared/capability-factory";

export const policies = buildPolicies(OCR_CONFIG);
