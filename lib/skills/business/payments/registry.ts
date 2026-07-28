/** ForgeOS Business Skills — Business Payments registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { PAYMENTS_DEF } from "./types";

export const PAYMENTS_SKILL = buildRegistry(PAYMENTS_DEF);
export const PAYMENTS_ACTIONS = PAYMENTS_DEF.actions;
