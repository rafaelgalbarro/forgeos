/** ForgeOS Business Skills — Business CRM adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { CRM_DEF } from "./types";
import { mockExecuteCrm } from "./mock-executor";

export const executeCrmViaRuntime = buildAdapter(
  CRM_DEF,
  mockExecuteCrm
);
