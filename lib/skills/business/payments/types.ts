/** ForgeOS Business Skills — Business Payments types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const PAYMENTS_DEF: BusinessProviderDef = {
  "domain": "payments",
  "skillId": "business-payments",
  "name": "Business Payments",
  "category": "payments",
  "provider": "forgeos-payments-mock",
  "capability": "payment_ops",
  "risks": [
    "financial",
    "external_api"
  ],
  "actions": [
    {
      "id": "charge",
      "label": "Charge",
      "description": "Charge customer",
      "risk": "critical"
    },
    {
      "id": "refund",
      "label": "Refund",
      "description": "Refund payment",
      "risk": "high"
    },
    {
      "id": "payout",
      "label": "Payout",
      "description": "Send payout",
      "risk": "critical"
    },
    {
      "id": "get_balance",
      "label": "Get Balance",
      "description": "Get account balance",
      "risk": "low"
    }
  ]
};
