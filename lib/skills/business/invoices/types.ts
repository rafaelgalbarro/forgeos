/** ForgeOS Business Skills — Business Invoices types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const INVOICES_DEF: BusinessProviderDef = {
  "domain": "invoices",
  "skillId": "business-invoices",
  "name": "Business Invoices",
  "category": "finance",
  "provider": "forgeos-invoices-mock",
  "capability": "invoice_ops",
  "risks": [
    "financial",
    "external_api"
  ],
  "actions": [
    {
      "id": "create_invoice",
      "label": "Create Invoice",
      "description": "Create invoice",
      "risk": "medium"
    },
    {
      "id": "send_invoice",
      "label": "Send Invoice",
      "description": "Send invoice to customer",
      "risk": "medium"
    },
    {
      "id": "track_invoice",
      "label": "Track Invoice",
      "description": "Track invoice status",
      "risk": "low"
    },
    {
      "id": "mark_paid",
      "label": "Mark Paid",
      "description": "Mark invoice as paid",
      "risk": "high"
    }
  ]
};
