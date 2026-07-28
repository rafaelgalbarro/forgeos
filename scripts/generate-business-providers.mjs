/** Generates business provider module files (RC4.4). Run: node scripts/generate-business-providers.mjs */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "lib", "skills", "business");

const PROVIDERS = [
  {
    folder: "crm",
    exportPrefix: "CRM",
    def: {
      domain: "crm",
      skillId: "business-crm",
      name: "Business CRM",
      category: "crm",
      provider: "forgeos-crm-mock",
      capability: "crm_ops",
      risks: ["external_api", "pii"],
      actions: [
        { id: "list_contacts", label: "List Contacts", description: "List CRM contacts", risk: "low" },
        { id: "create_lead", label: "Create Lead", description: "Create a sales lead", risk: "medium" },
        { id: "update_deal", label: "Update Deal", description: "Update deal stage", risk: "medium" },
        { id: "get_pipeline", label: "Get Pipeline", description: "View sales pipeline", risk: "low" },
      ],
    },
  },
  {
    folder: "erp",
    exportPrefix: "ERP",
    def: {
      domain: "erp",
      skillId: "business-erp",
      name: "Business ERP",
      category: "finance",
      provider: "forgeos-erp-mock",
      capability: "erp_ops",
      risks: ["external_api", "data_mutation"],
      actions: [
        { id: "check_inventory", label: "Check Inventory", description: "Check stock levels", risk: "low" },
        { id: "create_order", label: "Create Order", description: "Create ERP order", risk: "medium" },
        { id: "allocate_resource", label: "Allocate Resource", description: "Allocate resources", risk: "medium" },
        { id: "list_orders", label: "List Orders", description: "List recent orders", risk: "low" },
      ],
    },
  },
  {
    folder: "accounting",
    exportPrefix: "ACCOUNTING",
    def: {
      domain: "accounting",
      skillId: "business-accounting",
      name: "Business Accounting",
      category: "finance",
      provider: "forgeos-accounting-mock",
      capability: "accounting_ops",
      risks: ["financial", "compliance"],
      actions: [
        { id: "get_ledger", label: "Get Ledger", description: "Read ledger balances", risk: "low" },
        { id: "post_journal", label: "Post Journal", description: "Post journal entry", risk: "high" },
        { id: "generate_report", label: "Generate Report", description: "Generate financial report", risk: "medium" },
        { id: "reconcile", label: "Reconcile", description: "Reconcile accounts", risk: "medium" },
      ],
    },
  },
  {
    folder: "payments",
    exportPrefix: "PAYMENTS",
    def: {
      domain: "payments",
      skillId: "business-payments",
      name: "Business Payments",
      category: "payments",
      provider: "forgeos-payments-mock",
      capability: "payment_ops",
      risks: ["financial", "external_api"],
      actions: [
        { id: "charge", label: "Charge", description: "Charge customer", risk: "critical" },
        { id: "refund", label: "Refund", description: "Refund payment", risk: "high" },
        { id: "payout", label: "Payout", description: "Send payout", risk: "critical" },
        { id: "get_balance", label: "Get Balance", description: "Get account balance", risk: "low" },
      ],
    },
  },
  {
    folder: "contracts",
    exportPrefix: "CONTRACTS",
    def: {
      domain: "contracts",
      skillId: "business-contracts",
      name: "Business Contracts",
      category: "legal",
      provider: "forgeos-contracts-mock",
      capability: "contract_ops",
      risks: ["legal", "compliance"],
      actions: [
        { id: "create_contract", label: "Create Contract", description: "Create contract draft", risk: "medium" },
        { id: "sign_contract", label: "Sign Contract", description: "Sign contract", risk: "high" },
        { id: "review_contract", label: "Review Contract", description: "Review contract terms", risk: "low" },
        { id: "list_contracts", label: "List Contracts", description: "List contracts", risk: "low" },
      ],
    },
  },
  {
    folder: "billing",
    exportPrefix: "BILLING",
    def: {
      domain: "billing",
      skillId: "business-billing",
      name: "Business Billing",
      category: "finance",
      provider: "forgeos-billing-mock",
      capability: "billing_ops",
      risks: ["financial", "subscription"],
      actions: [
        { id: "create_subscription", label: "Create Subscription", description: "Create subscription", risk: "high" },
        { id: "update_plan", label: "Update Plan", description: "Update billing plan", risk: "medium" },
        { id: "track_usage", label: "Track Usage", description: "Track metered usage", risk: "low" },
        { id: "cancel_subscription", label: "Cancel Subscription", description: "Cancel subscription", risk: "high" },
      ],
    },
  },
  {
    folder: "invoices",
    exportPrefix: "INVOICES",
    def: {
      domain: "invoices",
      skillId: "business-invoices",
      name: "Business Invoices",
      category: "finance",
      provider: "forgeos-invoices-mock",
      capability: "invoice_ops",
      risks: ["financial", "external_api"],
      actions: [
        { id: "create_invoice", label: "Create Invoice", description: "Create invoice", risk: "medium" },
        { id: "send_invoice", label: "Send Invoice", description: "Send invoice to customer", risk: "medium" },
        { id: "track_invoice", label: "Track Invoice", description: "Track invoice status", risk: "low" },
        { id: "mark_paid", label: "Mark Paid", description: "Mark invoice as paid", risk: "high" },
      ],
    },
  },
  {
    folder: "customers",
    exportPrefix: "CUSTOMERS",
    def: {
      domain: "customers",
      skillId: "business-customers",
      name: "Business Customers",
      category: "crm",
      provider: "forgeos-customers-mock",
      capability: "customer_ops",
      risks: ["pii", "external_api"],
      actions: [
        { id: "get_profile", label: "Get Profile", description: "Get customer profile", risk: "low" },
        { id: "update_segment", label: "Update Segment", description: "Update customer segment", risk: "medium" },
        { id: "create_support_ticket", label: "Create Support Ticket", description: "Open support ticket", risk: "medium" },
        { id: "list_customers", label: "List Customers", description: "List customers", risk: "low" },
      ],
    },
  },
];

function writeFile(relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
}

for (const p of PROVIDERS) {
  const { folder, exportPrefix, def } = p;
  const constName = `${exportPrefix}_DEF`;

  writeFile(
    `${folder}/types.ts`,
    `/** ForgeOS Business Skills — ${def.name} types (RC4.4). */\n\nimport type { BusinessProviderDef } from "../types";\n\nexport const ${constName}: BusinessProviderDef = ${JSON.stringify(def, null, 2)};\n`
  );

  writeFile(
    `${folder}/registry.ts`,
    `/** ForgeOS Business Skills — ${def.name} registry (RC4.4). */\n\nimport { buildRegistry } from "../shared/factory";\nimport { ${constName} } from "./types";\n\nexport const ${exportPrefix}_SKILL = buildRegistry(${constName});\nexport const ${exportPrefix}_ACTIONS = ${constName}.actions;\n`
  );

  writeFile(
    `${folder}/permissions.ts`,
    `/** ForgeOS Business Skills — ${def.name} permissions (RC4.4). */\n\nimport { buildPermissions } from "../shared/factory";\nimport { ${constName} } from "./types";\n\nexport const ${exportPrefix}_PERMISSIONS = buildPermissions(${constName});\n`
  );

  writeFile(
    `${folder}/policies.ts`,
    `/** ForgeOS Business Skills — ${def.name} policies (RC4.4). */\n\nimport { buildPolicies } from "../shared/factory";\nimport { ${constName} } from "./types";\n\nexport const ${exportPrefix}_POLICIES = buildPolicies(${constName});\n`
  );

  writeFile(
    `${folder}/risk.ts`,
    `/** ForgeOS Business Skills — ${def.name} risk (RC4.4). */\n\nimport { assessActionRisk, buildActionRiskMaps } from "../shared/factory";\nimport { ${constName} } from "./types";\n\nexport const ${exportPrefix}_RISK_MAP = buildActionRiskMaps(${constName});\nexport function assess${exportPrefix.charAt(0) + exportPrefix.slice(1).toLowerCase()}Risk(action: string) {\n  return assessActionRisk(${constName}, action);\n}\n`
  );

  writeFile(
    `${folder}/rollback.ts`,
    `/** ForgeOS Business Skills — ${def.name} rollback (RC4.4). */\n\nimport { buildRollback } from "../shared/factory";\nimport { ${constName} } from "./types";\n\nexport const ${exportPrefix}_ROLLBACK = buildRollback(${constName});\n`
  );

  writeFile(
    `${folder}/mock-executor.ts`,
    `/** ForgeOS Business Skills — ${def.name} mock executor (RC4.4). */\n\nimport { buildMockExecutor } from "../shared/factory";\nimport { ${constName} } from "./types";\n\nexport const mockExecute${exportPrefix.charAt(0) + exportPrefix.slice(1).toLowerCase()} = buildMockExecutor(${constName});\n`
  );

  writeFile(
    `${folder}/sandbox.ts`,
    `/** ForgeOS Business Skills — ${def.name} sandbox (RC4.4). */\n\nimport { buildSandbox } from "../shared/factory";\nimport { ${constName} } from "./types";\n\nexport const ${exportPrefix}_SANDBOX = buildSandbox(${constName});\n`
  );

  writeFile(
    `${folder}/adapter.ts`,
    `/** ForgeOS Business Skills — ${def.name} adapter (RC4.4). Routes via Runtime — never direct API. */\n\nimport { buildAdapter } from "../shared/factory";\nimport { ${constName} } from "./types";\nimport { mockExecute${exportPrefix.charAt(0) + exportPrefix.slice(1).toLowerCase()} } from "./mock-executor";\n\nexport const execute${exportPrefix.charAt(0) + exportPrefix.slice(1).toLowerCase()}ViaRuntime = buildAdapter(\n  ${constName},\n  mockExecute${exportPrefix.charAt(0) + exportPrefix.slice(1).toLowerCase()}\n);\n`
  );

  writeFile(
    `${folder}/index.ts`,
    `/** ForgeOS Business Skills — ${def.name} module (RC4.4). */\n\nexport * from "./types";\nexport * from "./registry";\nexport * from "./permissions";\nexport * from "./policies";\nexport * from "./risk";\nexport * from "./rollback";\nexport * from "./mock-executor";\nexport * from "./sandbox";\nexport * from "./adapter";\n`
  );
}

console.log(`Generated ${PROVIDERS.length} business provider modules.`);
