# Composition Root Map

**Root:** `src/core/composition/root.ts` — `createCompositionRoot()` / `getCompositionRoot()` (lazy; no import-time side effects).

| SERVICE | IMPLEMENTATION | REGISTRATION | CONSUMER | RUNTIME EVIDENCE |
|---------|----------------|--------------|----------|------------------|
| command bus | `commands/bus.ts` | `createApplicationLayer` | API/actions/cert | `/api/v2/health` handlers count; atlas Create* |
| query bus | `queries/bus.ts` | same | presentation queries | atlas GetMission* PASS |
| event bus | `events/bus/canonical-bus.ts` | composition root | health | ready checks |
| workflow engine | `orchestration-kernel.ts` | composition root | atlas runner | kernelStatus=completed |
| mission repo | file UoW | `file-store.ts` | handlers | `.forgeos/v2-store` |
| venture repo | file UoW | same | handlers | atlas venture id |
| output repo | file UoW + delivery | same | handlers/delivery | 9 outputs |
| artifact repo | delivery registry | delivery kernel | atlas | deliverySnapshots |
| project/codebase | delivery codebase | delivery kernel | atlas | cb-* id |
| release repo | delivery + UoW | publishRelease | atlas | RC PUBLISHED |
| deployment repo | delivery | planDeployment | atlas | PLAN_READY dry-run |
| capability registry/executor | orchestration | kernel ports | atlas fail/retry | n_brand retry |
| provenance graph | delivery lineage | lineage() | check-v2-lineage | lineage-check.json |
| impact analyzer | changeImpact | delivery | atlas | change_impact PASS |
| feature flags | migration/feature-flags | env defaults OFF | /api/v2/health | all false |
| approvals | decisions + gates | command bus | atlas | RequestDecision |
| persistence | `.forgeos/v2-store/application-state.json` | atomic rename | recovery probe | persistence_recovery PASS |

Presentation cache (`src/presentation/application-cache.ts`) uses composition root (not `createTestPorts`).
