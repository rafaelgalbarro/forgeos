/** ForgeOS Business Skills — Business ERP registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { ERP_DEF } from "./types";

export const ERP_SKILL = buildRegistry(ERP_DEF);
export const ERP_ACTIONS = ERP_DEF.actions;
