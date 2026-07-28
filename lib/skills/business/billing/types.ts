/** ForgeOS Business Skills — Business Billing types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const BILLING_DEF: BusinessProviderDef = {
  "domain": "billing",
  "skillId": "business-billing",
  "name": "Business Billing",
  "category": "finance",
  "provider": "forgeos-billing-mock",
  "capability": "billing_ops",
  "risks": [
    "financial",
    "subscription"
  ],
  "actions": [
    {
      "id": "create_subscription",
      "label": "Create Subscription",
      "description": "Create subscription",
      "risk": "high"
    },
    {
      "id": "update_plan",
      "label": "Update Plan",
      "description": "Update billing plan",
      "risk": "medium"
    },
    {
      "id": "track_usage",
      "label": "Track Usage",
      "description": "Track metered usage",
      "risk": "low"
    },
    {
      "id": "cancel_subscription",
      "label": "Cancel Subscription",
      "description": "Cancel subscription",
      "risk": "high"
    }
  ]
};
