# Skills Governance (RC4.1)

Safety and governance layer for all ForgeOS skill executions.

## Flow

```
Request → Risk → Permission → Approval → Policy → Execution Guard → executeSkillCore → Audit → Memory → Decision Graph → Telemetry
```

## Modules

| Module | Purpose |
|--------|---------|
| `risk-engine.ts` | Risk assessment and sandbox mode selection |
| `permission-engine.ts` | Actor/department permission checks |
| `approval-engine.ts` | Approval queue and decision simulation |
| `policy-engine.ts` | Cost, security, privacy, compliance policies |
| `execution-guard.ts` | Rate limits, security, sandbox enforcement |
| `audit-engine.ts` | Governance audit trail |
| `rollback-engine.ts` | Rollback and compensation plans |
| `security-engine.ts` | Security scans and violations |
| `credentials-manager.ts` | Mock credential resolution |
| `sandbox-manager.ts` | Sandbox mode configuration |
| `rate-limiter.ts` | Per-skill rate limiting |
| `pipeline.ts` | Orchestrates the full governance flow |

## Integration

- `lib/skills/pipeline.ts` delegates to `runGovernedSkillRequest`
- Governance calls `executeSkillCore` via `lib/skills/adapters/governance-adapter.ts`
- No circular imports: skills → governance → adapter → skills internals

## Constraints

- Sandbox/mock only — no real API connections
- Production mode blocked in RC4.1
