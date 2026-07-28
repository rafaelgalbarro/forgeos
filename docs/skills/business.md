# Business Skills (RC4.4)

Enterprise/business skills for ForgeOS — all **mock/sandbox**, no real API connections.

## Domains

| Module | Skill ID | Actions |
|--------|----------|---------|
| CRM | `business-crm` | contacts, leads, deals, pipeline |
| ERP | `business-erp` | inventory, orders, resources |
| Accounting | `business-accounting` | ledger, journal, reports |
| Payments | `business-payments` | charge, refund, payout |
| Contracts | `business-contracts` | create, sign, review |
| Billing | `business-billing` | subscriptions, plans, usage |
| Invoices | `business-invoices` | create, send, track |
| Customers | `business-customers` | profiles, segments, support |

## Execution

All skills route through `runGovernedSkillRequest` → `executeSkillCore` → Runtime adapter.  
Higher risk: `business-payments`, `business-contracts`.

## Lab

Open `/lab/business-skills` to visualize domains, telemetry, and audit timeline.

## Structure

```
lib/skills/business/
  crm/ erp/ accounting/ payments/ contracts/ billing/ invoices/ customers/
  registry.ts  types.ts  index.ts
```

Each provider exports: registry, permissions, policies, risk, rollback, mock-executor, sandbox, adapter.
