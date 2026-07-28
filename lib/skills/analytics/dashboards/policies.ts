/** Analytics Dashboards — policies (RC4.6). */

import { buildPolicies } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";

export const DASHBOARDS_POLICIES = buildPolicies(DASHBOARDS_DEF);
