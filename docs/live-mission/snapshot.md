# Snapshot Schema — PROGRAM 5300

Lightweight, serializable snapshot for client polling. No engine internals.

## Shape

```typescript
interface LiveMissionSerializableSnapshot {
  missionId: string;
  generatedAt: string;
  stage: MissionPhase;
  progress: number;
  missionState: LiveMissionVisibleState;
  activeDepartments: LiveMissionDepartmentView[];
  queuedTasks: LiveMissionTaskView[];
  runningTasks: LiveMissionTaskView[];
  completedTasks: LiveMissionTaskView[];
  failedTasks: LiveMissionTaskView[];
  recentEvents: LiveMissionUIEvent[];
  generatedArtifacts: LiveMissionArtifactView[];
  estimatedRemainingTime: number; // seconds
  errorsAndWarnings: LiveMissionWarning[];
}
```

## Builder

`buildSerializableSnapshot(mission)` in `lib/live-mission/live-mission-snapshot.ts`:

- Progress from `combinedProgress` (phase + snapshots + liveExecution)
- Tasks from `autonomous.tasks` or `liveMission.tasks`
- Departments from `liveMission.departmentActivity`
- Artifacts from completed snapshots + GTM snapshot
- ETA from `estimateQueueEtaSeconds` + `autonomous.etaSeconds`
- Events from `collectUIEventsFromMission` (events + history + tasks + decisions)

## Client access

```typescript
import { getLiveMissionSnapshot, useLiveMissionSnapshot } from "@/lib/live-mission";

const snap = getLiveMissionSnapshot(missionId);
// or
const snap = useLiveMissionSnapshot(missionId, 2000);
```

## SSR safety

Snapshot builder imports only coordinator modules — no Execution Engine, Scheduler, or AI Runtime factories.
