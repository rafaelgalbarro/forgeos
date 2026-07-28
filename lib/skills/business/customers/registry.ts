/** ForgeOS Business Skills — Business Customers registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { CUSTOMERS_DEF } from "./types";

export const CUSTOMERS_SKILL = buildRegistry(CUSTOMERS_DEF);
export const CUSTOMERS_ACTIONS = CUSTOMERS_DEF.actions;
