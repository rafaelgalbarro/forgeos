/** ForgeOS Business Skills — Business Contracts permissions (RC4.4). */

import { buildPermissions } from "../shared/factory";
import { CONTRACTS_DEF } from "./types";

export const CONTRACTS_PERMISSIONS = buildPermissions(CONTRACTS_DEF);
