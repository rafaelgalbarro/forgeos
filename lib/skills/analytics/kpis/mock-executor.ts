/** Analytics KPIs — mock execution (RC4.6). */

import { buildMockExecutor } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";

export const executeKPISMock = buildMockExecutor(KPIS_DEF);
