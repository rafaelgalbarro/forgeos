# Mission Flow

## Phases

```
UNDERSTAND → PLAN → BUILD → VALIDATE → DEPLOY → OPERATE → EVOLVE
```

| Phase | Purpose | Typical actions |
|-------|---------|-----------------|
| UNDERSTAND | Capture idea, classify intention | Card click or text → intention-engine |
| PLAN | Seed decisions, route to factory | smart-routing + decision-center |
| BUILD | Factory pipeline via adapters | Progressive live-execution steps |
| VALIDATE | Executive council on important items | executive-orchestration banner |
| DEPLOY | Cloud + production hints | cloud-foundation + production adapters |
| OPERATE | Monitor snapshots | MissionProgressPanel updates |
| EVOLVE | Continuous improvement | Timeline + auto-pilot |

## State machine

Implemented in `lib/mission-control/mission-flow.ts`:

- `createInitialMission()` — empty mission at UNDERSTAND
- `setIntention()` — card or classified text
- `advancePhase()` — linear progression
- `snapshotsForIntention()` — which progress domains activate per intention

## Persistence

`lib/mission-control/mission-persistence.ts` stores missions in `localStorage` under `forgeos-mission-control-missions`.
