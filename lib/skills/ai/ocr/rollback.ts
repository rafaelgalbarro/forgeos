/** ForgeOS AI ocr capability — rollback (RC4.7). */

import { OCR_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(OCR_CONFIG, action);
}
