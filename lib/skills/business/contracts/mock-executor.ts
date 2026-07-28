/** ForgeOS Business Skills — Business Contracts mock executor (RC4.4). */

import { buildMockExecutor } from "../shared/factory";
import { CONTRACTS_DEF } from "./types";

export const mockExecuteContracts = buildMockExecutor(CONTRACTS_DEF);
