/** ForgeOS Business Skills — Business Accounting adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { ACCOUNTING_DEF } from "./types";
import { mockExecuteAccounting } from "./mock-executor";

export const executeAccountingViaRuntime = buildAdapter(
  ACCOUNTING_DEF,
  mockExecuteAccounting
);
