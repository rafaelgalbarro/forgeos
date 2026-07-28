/** ForgeOS Productivity Documents — rollback (RC4.3). */

import { createProductivityRollbackBuilder } from "../create-provider";
import { DOCUMENTS_CONFIG } from "../provider-configs";

export const buildDocumentsRollback = createProductivityRollbackBuilder(DOCUMENTS_CONFIG);
