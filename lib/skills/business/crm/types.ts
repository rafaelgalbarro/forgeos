/** ForgeOS Business Skills — Business CRM types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const CRM_DEF: BusinessProviderDef = {
  "domain": "crm",
  "skillId": "business-crm",
  "name": "Business CRM",
  "category": "crm",
  "provider": "forgeos-crm-mock",
  "capability": "crm_ops",
  "risks": [
    "external_api",
    "pii"
  ],
  "actions": [
    {
      "id": "list_contacts",
      "label": "List Contacts",
      "description": "List CRM contacts",
      "risk": "low"
    },
    {
      "id": "create_lead",
      "label": "Create Lead",
      "description": "Create a sales lead",
      "risk": "medium"
    },
    {
      "id": "update_deal",
      "label": "Update Deal",
      "description": "Update deal stage",
      "risk": "medium"
    },
    {
      "id": "get_pipeline",
      "label": "Get Pipeline",
      "description": "View sales pipeline",
      "risk": "low"
    }
  ]
};
