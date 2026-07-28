/** ForgeOS Business Skills — Business CRM registry (RC4.4). */

import { buildRegistry } from "../shared/factory";
import { CRM_DEF } from "./types";

export const CRM_SKILL = buildRegistry(CRM_DEF);
export const CRM_ACTIONS = CRM_DEF.actions;
