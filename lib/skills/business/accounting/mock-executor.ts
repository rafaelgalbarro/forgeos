/** ForgeOS Business Skills — Business Accounting mock executor (RC4.4). */

import { buildMockExecutor } from "../shared/factory";
import { ACCOUNTING_DEF } from "./types";

export const mockExecuteAccounting = buildMockExecutor(ACCOUNTING_DEF);
