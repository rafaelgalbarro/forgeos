# Approval Engine

Manages approval requirements and simulates approval decisions in sandbox mode.

## Approval Types

| Type | When |
|------|------|
| `auto` | Low risk |
| `founder` | Email and founder-scoped skills |
| `ceo` | Medium risk |
| `dual` | High risk, payments, deployment |
| `board` | Critical infrastructure |
| `emergency` | Emergency override flag |

## Flow

1. Resolve approval type from skill map or risk level
2. Append to approval queue (if not auto)
3. Simulate approval in sandbox
4. Return `ApprovalDecision` with signature

## API

- `processApproval(params)` — Process and return decision
- `getApprovalRequirements(skillId, riskLevel)` — Lookup required type
