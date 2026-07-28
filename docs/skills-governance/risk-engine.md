# Risk Engine

Assesses risk for every skill execution based on skill category, action patterns, and skill metadata.

## Risk Levels

| Level | Score | Approval | Sandbox |
|-------|-------|----------|---------|
| LOW | < 35 | auto | simulation |
| MEDIUM | 35–64 | ceo | dry_run |
| HIGH | 65–84 | dual | sandbox |
| CRITICAL | ≥ 85 | board | sandbox |

## Factors

- Critical infrastructure skills (aws, azure, gcp, stripe, s3)
- Destructive actions (delete, drop, destroy, purge)
- Production deployment actions
- Financial and cloud cost risks
- AI provider invocations

## API

- `assessSkillRisk(skillId, action)` — Returns `RiskAssessment`
- `getRiskMatrix()` — Sample matrix for lab display
