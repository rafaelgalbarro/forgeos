# Approvals & Decision Gates

## Gate types

- `INFORMATION`
- `RECOMMENDATION`
- `APPROVAL`
- `SECURITY_APPROVAL`
- `FINANCIAL_APPROVAL`
- `DEPLOYMENT_APPROVAL`

Blocking gates: `APPROVAL`, `SECURITY_APPROVAL`, `FINANCIAL_APPROVAL`, `DEPLOYMENT_APPROVAL`.

## Behavior

When a required approval is missing, the node becomes `awaiting_approval` and **dependent nodes are blocked**. The kernel does not invent UI-only states — transitions emit canonical domain events.

`DRY_RUN` / `PREVIEW_ONLY` may auto-approve via `autoApproveInDryRun` for deterministic fixture runs.
