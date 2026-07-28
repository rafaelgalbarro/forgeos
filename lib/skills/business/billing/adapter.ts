/** ForgeOS Business Skills — Business Billing adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { BILLING_DEF } from "./types";
import { mockExecuteBilling } from "./mock-executor";

export const executeBillingViaRuntime = buildAdapter(
  BILLING_DEF,
  mockExecuteBilling
);
