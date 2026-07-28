/** ForgeOS Business Skills — Business Payments permissions (RC4.4). */

import { buildPermissions } from "../shared/factory";
import { PAYMENTS_DEF } from "./types";

export const PAYMENTS_PERMISSIONS = buildPermissions(PAYMENTS_DEF);
