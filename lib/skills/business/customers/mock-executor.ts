/** ForgeOS Business Skills — Business Customers mock executor (RC4.4). */

import { buildMockExecutor } from "../shared/factory";
import { CUSTOMERS_DEF } from "./types";

export const mockExecuteCustomers = buildMockExecutor(CUSTOMERS_DEF);
