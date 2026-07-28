/** ForgeOS Business Skills — Business Customers adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { CUSTOMERS_DEF } from "./types";
import { mockExecuteCustomers } from "./mock-executor";

export const executeCustomersViaRuntime = buildAdapter(
  CUSTOMERS_DEF,
  mockExecuteCustomers
);
