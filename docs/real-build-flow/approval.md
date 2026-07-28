# Approval — Real Build Flow

Uses RC5.1 `requestExecutionApproval` with capability `deploy_software`.

Gates:
- `REAL_BUILD_REQUIRE_APPROVAL=true` (default)
- `ENABLE_REAL_EXECUTION` and RC5.1 policy for provider steps
- Human approve via `POST /api/real-build-flow/approve`

Lab simulates founder approval.
