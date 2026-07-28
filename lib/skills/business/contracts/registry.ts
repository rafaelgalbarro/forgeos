/** ForgeOS Business Skills — Business Contracts registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { CONTRACTS_DEF } from "./types";

export const CONTRACTS_SKILL = buildRegistry(CONTRACTS_DEF);
export const CONTRACTS_ACTIONS = CONTRACTS_DEF.actions;
