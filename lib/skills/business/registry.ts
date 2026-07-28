/** ForgeOS Business Skills — aggregated registry (RC4.4). */

import type { SkillDefinition } from "@/lib/skills/types";
import { CRM_SKILL } from "./crm/registry";
import { ERP_SKILL } from "./erp/registry";
import { ACCOUNTING_SKILL } from "./accounting/registry";
import { PAYMENTS_SKILL } from "./payments/registry";
import { CONTRACTS_SKILL } from "./contracts/registry";
import { BILLING_SKILL } from "./billing/registry";
import { INVOICES_SKILL } from "./invoices/registry";
import { CUSTOMERS_SKILL } from "./customers/registry";

export const BUSINESS_SKILL_REGISTRY: SkillDefinition[] = [
  CRM_SKILL,
  ERP_SKILL,
  ACCOUNTING_SKILL,
  PAYMENTS_SKILL,
  CONTRACTS_SKILL,
  BILLING_SKILL,
  INVOICES_SKILL,
  CUSTOMERS_SKILL,
];

export const BUSINESS_SKILL_IDS = BUSINESS_SKILL_REGISTRY.map((s) => s.id);

export function getBusinessSkillById(id: string): SkillDefinition | undefined {
  return BUSINESS_SKILL_REGISTRY.find((s) => s.id === id);
}

export function isBusinessSkill(id: string): boolean {
  return BUSINESS_SKILL_IDS.includes(id);
}
