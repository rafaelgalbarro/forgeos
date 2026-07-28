# Migration registry

Source of truth: `src/core/migration/registry.ts` (`MIGRATION_REGISTRY`, seed count = 10).

Each entry records:

- component, flow, current contract, V2 contract, adapter path
- status, consumers, rollback strategy, owner, evidence

## Seeded components (10)

| Component | Status (seed) | Legacy | V2 |
|-----------|---------------|--------|----|
| mission.reads | DUAL_READ | `lib/mission-control` persistence/repo | `src/core/domain/mission` |
| mission.commands | ADAPTER_READY | mission-flow / conversation-engine | `src/core/application/commands` |
| decisions | DUAL_WRITE | `decision-center.ts` | `src/core/domain/decision` |
| artifacts | ADAPTER_READY | MissionArtifact | `domain/artifact` |
| outputs | DUAL_READ | `lib/creation-output` | `domain/output` |
| codebases | ADAPTER_READY | `lib/code-generation` | `domain/codebase` |
| builds | ADAPTER_READY | `lib/build-pipeline` | lifecycle/build |
| previews | NOT_STARTED | `lib/preview-runtime` | preview entity (stub) |
| deployments | NOT_STARTED | `lib/preview-deployment` | deployment entity (stub) |
| company.overview | NOT_STARTED | autonomous-company | Company OS gap |

Status values may advance only with adapter evidence + tests.
