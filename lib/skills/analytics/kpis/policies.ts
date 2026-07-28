/** Analytics KPIs — policies (RC4.6). */

import { buildPolicies } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";

export const KPIS_POLICIES = buildPolicies(KPIS_DEF);
