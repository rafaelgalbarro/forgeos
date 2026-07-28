/** Analytics Reports — policies (RC4.6). */

import { buildPolicies } from "../shared/provider-kit";
import { REPORTS_DEF } from "./types";

export const REPORTS_POLICIES = buildPolicies(REPORTS_DEF);
