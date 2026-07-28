# Mission Page — PROGRAM 6060

## Route

`/missions/[missionId]?section=`

Sections: Overview, Plan, Conversation, Decisions, Activity, Outputs, Costs, History.

Also linked from Mission Control (`/mission-control/[missionId]` conversation-first).

## Data

`loadMissionPageVM(missionId)` → Query Layer V2 (`GetMissionOverview`, `GetMissionPlan`).

## States

`loading.tsx` / `error.tsx` under `app/missions/[missionId]/`.
