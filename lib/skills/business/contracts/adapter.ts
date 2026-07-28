/** ForgeOS Business Skills — Business Contracts adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { CONTRACTS_DEF } from "./types";
import { mockExecuteContracts } from "./mock-executor";

export const executeContractsViaRuntime = buildAdapter(
  CONTRACTS_DEF,
  mockExecuteContracts
);
