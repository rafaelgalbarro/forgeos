/** ForgeOS Business Skills — Business Accounting types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const ACCOUNTING_DEF: BusinessProviderDef = {
  "domain": "accounting",
  "skillId": "business-accounting",
  "name": "Business Accounting",
  "category": "finance",
  "provider": "forgeos-accounting-mock",
  "capability": "accounting_ops",
  "risks": [
    "financial",
    "compliance"
  ],
  "actions": [
    {
      "id": "get_ledger",
      "label": "Get Ledger",
      "description": "Read ledger balances",
      "risk": "low"
    },
    {
      "id": "post_journal",
      "label": "Post Journal",
      "description": "Post journal entry",
      "risk": "high"
    },
    {
      "id": "generate_report",
      "label": "Generate Report",
      "description": "Generate financial report",
      "risk": "medium"
    },
    {
      "id": "reconcile",
      "label": "Reconcile",
      "description": "Reconcile accounts",
      "risk": "medium"
    }
  ]
};
