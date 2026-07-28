# Skills Governance Architecture

## Pipeline Flow

```
Request
  → Risk Assessment
  → Permission Check
  → Approval
  → Policy Evaluation
  → Execution Guard
  → executeSkillCore (via governance-adapter)
  → Audit
  → Memory
  → Decision Graph
  → Telemetry
```

## Module Layout

```
lib/skills-governance/
  types.ts
  risk-engine.ts
  permission-engine.ts
  approval-engine.ts
  policy-engine.ts
  execution-guard.ts
  audit-engine.ts
  rollback-engine.ts
  security-engine.ts
  credentials-manager.ts
  sandbox-manager.ts
  rate-limiter.ts
  governance-store.ts
  governance-history.ts
  governance-events.ts
  pipeline.ts
  index.ts
```

## Integration Pattern

```
lib/skills/pipeline.ts
  └── runGovernedSkillRequest()  [skills-governance/pipeline.ts]
        └── executeSkillCore()   [skills/adapters/governance-adapter.ts]
              └── router, executor, store, memory-adapter
```

No circular imports: skills imports governance; governance imports adapter only.

## Storage Keys

| Key | Purpose |
|-----|---------|
| `skillGovernanceApprovals` | Approval queue |
| `skillGovernanceAudit` | Audit log |
| `skillGovernanceTelemetry` | Governance telemetry |
| `skillGovernanceHistory` | Execution history |
| `skillGovernanceEvents` | Stage events |

## Sandbox Modes

| Mode | Description |
|------|-------------|
| `simulation` | Full simulation, no side effects |
| `dry_run` | Validates without execution |
| `sandbox` | Mock provider responses |
| `production` | Blocked in RC4.1 |
