# Policies

Multi-dimensional policy evaluation before skill execution.

## Policy Kinds

| Kind | Checks |
|------|--------|
| `cost` | Per-call cost caps |
| `security` | Production mode, financial ops |
| `privacy` | PII handling |
| `execution` | Skill status, timeouts |
| `compliance` | Legal category rules |
| `ai_usage` | AI Runtime routing |
| `tool` | External tool access |
| `organization` | Org sandbox default |

## Evaluation

All policies run in sequence. First failure blocks execution with `blockedBy` policy kind.

## API

- `evaluateAllPolicies(skillId, action, sandboxMode)` — Full evaluation
- `listPolicyKinds()` — Available policy kinds
