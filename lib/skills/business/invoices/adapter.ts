/** ForgeOS Business Skills — Business Invoices adapter (RC4.4). Routes via Runtime — never direct API. */

import { buildAdapter } from "../shared/factory";
import { INVOICES_DEF } from "./types";
import { mockExecuteInvoices } from "./mock-executor";

export const executeInvoicesViaRuntime = buildAdapter(
  INVOICES_DEF,
  mockExecuteInvoices
);
