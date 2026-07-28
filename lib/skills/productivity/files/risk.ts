/** ForgeOS Productivity Files — risk (RC4.3). */

import { createProductivityRiskAssessor } from "../create-provider";
import { FILES_CONFIG } from "../provider-configs";

export const assessFilesRisk = createProductivityRiskAssessor(FILES_CONFIG);
