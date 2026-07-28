/** ForgeOS Business Skills — Business ERP types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const ERP_DEF: BusinessProviderDef = {
  "domain": "erp",
  "skillId": "business-erp",
  "name": "Business ERP",
  "category": "finance",
  "provider": "forgeos-erp-mock",
  "capability": "erp_ops",
  "risks": [
    "external_api",
    "data_mutation"
  ],
  "actions": [
    {
      "id": "check_inventory",
      "label": "Check Inventory",
      "description": "Check stock levels",
      "risk": "low"
    },
    {
      "id": "create_order",
      "label": "Create Order",
      "description": "Create ERP order",
      "risk": "medium"
    },
    {
      "id": "allocate_resource",
      "label": "Allocate Resource",
      "description": "Allocate resources",
      "risk": "medium"
    },
    {
      "id": "list_orders",
      "label": "List Orders",
      "description": "List recent orders",
      "risk": "low"
    }
  ]
};
