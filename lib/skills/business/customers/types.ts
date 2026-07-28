/** ForgeOS Business Skills — Business Customers types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const CUSTOMERS_DEF: BusinessProviderDef = {
  "domain": "customers",
  "skillId": "business-customers",
  "name": "Business Customers",
  "category": "crm",
  "provider": "forgeos-customers-mock",
  "capability": "customer_ops",
  "risks": [
    "pii",
    "external_api"
  ],
  "actions": [
    {
      "id": "get_profile",
      "label": "Get Profile",
      "description": "Get customer profile",
      "risk": "low"
    },
    {
      "id": "update_segment",
      "label": "Update Segment",
      "description": "Update customer segment",
      "risk": "medium"
    },
    {
      "id": "create_support_ticket",
      "label": "Create Support Ticket",
      "description": "Open support ticket",
      "risk": "medium"
    },
    {
      "id": "list_customers",
      "label": "List Customers",
      "description": "List customers",
      "risk": "low"
    }
  ]
};
