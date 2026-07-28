/** ForgeOS AI embeddings capability — risk (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(EMBEDDINGS_CONFIG, action);
}
