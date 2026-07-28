# Skills Governance (RC4.1)

Safety and governance layer ensuring every ForgeOS skill execution passes through risk assessment, permissions, approval, policy checks, and audit before execution.

## Overview

RC4.1 adds a governance pipeline on top of the RC4 Skills Framework. No skill executes directly — all requests flow through `runGovernedSkillRequest`.

## Key Concepts

- **Risk Engine** — Assesses skill/action risk and selects sandbox mode
- **Permission Engine** — Validates actor and department permissions
- **Approval Engine** — Manages approval queue and decisions
- **Policy Engine** — Evaluates cost, security, privacy, compliance policies
- **Execution Guard** — Rate limits, security checks, sandbox enforcement
- **Audit Engine** — Immutable governance audit trail

## Documentation

- [Architecture](./architecture.md)
- [Risk Engine](./risk-engine.md)
- [Approval Engine](./approval-engine.md)
- [Permissions](./permissions.md)
- [Policies](./policies.md)
- [Audit](./audit.md)
- [Rollback](./rollback.md)
- [Security](./security.md)

## Lab

Open `/lab/skills-governance` to inspect risk matrix, permissions, policies, approval queue, audit log, rollback plans, security events, and execution flow.

## Constraints

- Sandbox/mock only — no real API connections
- Production mode blocked in RC4.1
- All executions require governance pipeline pass
