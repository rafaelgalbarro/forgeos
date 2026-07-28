/** ForgeOS Productivity Files — rollback (RC4.3). */

import { createProductivityRollbackBuilder } from "../create-provider";
import { FILES_CONFIG } from "../provider-configs";

export const buildFilesRollback = createProductivityRollbackBuilder(FILES_CONFIG);
