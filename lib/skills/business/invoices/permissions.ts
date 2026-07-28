/** ForgeOS Business Skills — Business Invoices permissions (RC4.4). */

import { buildPermissions } from "../shared/factory";
import { INVOICES_DEF } from "./types";

export const INVOICES_PERMISSIONS = buildPermissions(INVOICES_DEF);
