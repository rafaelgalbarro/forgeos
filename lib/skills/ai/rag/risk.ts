/** ForgeOS AI rag capability — risk (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(RAG_CONFIG, action);
}
