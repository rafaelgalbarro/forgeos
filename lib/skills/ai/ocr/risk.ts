/** ForgeOS AI ocr capability — risk (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(OCR_CONFIG, action);
}
