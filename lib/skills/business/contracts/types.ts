/** ForgeOS Business Skills — Business Contracts types (RC4.4). */

import type { BusinessProviderDef } from "../types";

export const CONTRACTS_DEF: BusinessProviderDef = {
  "domain": "contracts",
  "skillId": "business-contracts",
  "name": "Business Contracts",
  "category": "legal",
  "provider": "forgeos-contracts-mock",
  "capability": "contract_ops",
  "risks": [
    "legal",
    "compliance"
  ],
  "actions": [
    {
      "id": "create_contract",
      "label": "Create Contract",
      "description": "Create contract draft",
      "risk": "medium"
    },
    {
      "id": "sign_contract",
      "label": "Sign Contract",
      "description": "Sign contract",
      "risk": "high"
    },
    {
      "id": "review_contract",
      "label": "Review Contract",
      "description": "Review contract terms",
      "risk": "low"
    },
    {
      "id": "list_contracts",
      "label": "List Contracts",
      "description": "List contracts",
      "risk": "low"
    }
  ]
};
