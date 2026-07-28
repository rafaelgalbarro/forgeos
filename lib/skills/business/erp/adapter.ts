/** ForgeOS Business Skills — Business ERP adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { ERP_DEF } from "./types";
import { mockExecuteErp } from "./mock-executor";

export const executeErpViaRuntime = buildAdapter(
  ERP_DEF,
  mockExecuteErp
);
