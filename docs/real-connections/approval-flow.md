# Approval Flow

## Chain

```
Capability Request
  → Risk Engine (assessSkillRisk)
  → Permission Engine (department check)
  → Approval Engine (processApproval)
  → Policy Engine (evaluateAllPolicies)
  → Execution Guard (guardExecution)
  → Connection Adapter (dry-run or blocked)
```

## Request approval API

```http
POST /api/connections/request-approval
Content-Type: application/json

{
  "provider": "github",
  "operation": "create_repository",
  "ventureId": "demo-venture-vandl",
  "requestedBy": "cto",
  "approvedBy": "ceo"
}
```

## Approval types

- **auto** — low risk, no approval needed
- **department** — requires department head
- **executive** — requires CEO approval
- **emergency** — expedited with audit trail

Production execution additionally requires `FORGEOS_CONNECTIONS_PRODUCTION=true` and `userConfirmed: true`.
