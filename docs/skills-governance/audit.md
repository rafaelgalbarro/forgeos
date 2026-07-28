# Audit

Immutable governance audit trail for all skill governance decisions.

## Record Fields

- `who` — Requesting actor
- `what` — Action description
- `why` — Rationale or block reason
- `outcome` — approved | denied | executed | failed | rolled_back
- `signature` — Approval or block signature
- `riskLevel` — Risk at time of decision

## Outcomes

| Outcome | When |
|---------|------|
| `approved` | Pre-execution approval granted |
| `denied` | Blocked by governance stage |
| `executed` | Skill executed successfully |
| `failed` | Execution failed |
| `rolled_back` | Rollback initiated |

## Storage

Records stored in `skillGovernanceAudit` localStorage key (max 1000 entries).

## API

- `recordGovernanceAudit(params)` — Create audit record
- `auditBlockedExecution(params)` — Block audit shortcut
- `auditSuccessfulExecution(params)` — Success audit shortcut
- `getGovernanceAuditLog(ventureId?)` — Query log
