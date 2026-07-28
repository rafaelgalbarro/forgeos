# Security — PROGRAM 6080

**Source:** [`e2e-evidence.json`](./e2e-evidence.json) → `security[]`

| Check | Status | Evidence | Notes |
|-------|--------|----------|-------|
| No secrets in client | PARTIAL | secret-redaction, secret-scanner, network-policy | Bundle scan incomplete (build failed) |
| No production deploy | PASS | `lib/preview-deployment/config.ts` | `allowProduction` default false; `ENABLE_PREVIEW_DEPLOYMENT` default false |
| Command authorization | PARTIAL | `command-allowlist.ts`, `AuthorizationPort` | Sandbox allowlist real; app auth port not buildable |
| Workspace isolation | PARTIAL | workspace domain + `canAccessWorkspace` | Not multi-tenant live-certified |
| Sandbox isolation | PARTIAL | sandbox-manager / preview-runtime security docs | Process sandbox ≠ full product isolation |
| Approval enforcement | PARTIAL | preview-deployment `requireApproval` default true; orchestration gates | Fragmented legacy + V2 |
| Audit trail | PARTIAL | deployment-audit + events catalog | No single global mission audit bus certified |
| Safe error messages | SKIPPED | — | NOT AUTOMATED (smoke NOT_RUN) |

## Markers

- Preview deployment path defaults to **DRY_RUN / plan-only** when real flags/creds are off.
- No production URLs invented during certification.
- Do not treat allowlist presence as authenticated RBAC.

## Residual risks

1. Client secret leakage cannot be cleared while production build fails.  
2. Approval surfaces are multiple — enforcement inconsistency risk.  
3. Persistence via localStorage weakens audit durability.
