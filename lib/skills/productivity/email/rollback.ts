/** ForgeOS Productivity Email — rollback (RC4.3). */

import { createProductivityRollbackBuilder } from "../create-provider";
import { EMAIL_CONFIG } from "../provider-configs";

export const buildEmailRollback = createProductivityRollbackBuilder(EMAIL_CONFIG);
