/** Analytics KPIs — runtime adapter (RC4.6). */

import { buildAdapter } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";
import { executeKPISMock } from "./mock-executor";

export const executeKPISViaRuntime = buildAdapter(KPIS_DEF, executeKPISMock);
