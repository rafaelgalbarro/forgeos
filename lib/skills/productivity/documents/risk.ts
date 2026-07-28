/** ForgeOS Productivity Documents — risk (RC4.3). */

import { createProductivityRiskAssessor } from "../create-provider";
import { DOCUMENTS_CONFIG } from "../provider-configs";

export const assessDocumentsRisk = createProductivityRiskAssessor(DOCUMENTS_CONFIG);
