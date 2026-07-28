/** ForgeOS Business Skills — Business Payments policies (RC4.4). */

import { buildPolicies } from "../shared/factory";
import { PAYMENTS_DEF } from "./types";

export const PAYMENTS_POLICIES = buildPolicies(PAYMENTS_DEF);
