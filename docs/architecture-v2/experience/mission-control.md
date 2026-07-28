# Mission Control V2 — PROGRAM 6060

## Role

Primary ForgeOS V2 entry. Founder creates/operates a company without understanding internal architecture.

## Surfaces

- `/mission-control` — overview + AI CEO conversation (client loaded on demand)
- `/mission-control/[missionId]` — same with mission context

## Data

- Query Layer V2: `GetMissionOverview` (`src/core/application/queries.ts`)
- Presentation adapter: `src/presentation/adapters/mission-query-adapter.ts` → `MissionControlVM`
- Components receive **view models only** (no domain aggregates)

## Shown

AI CEO conversation, mission objective, stage, next decision, plan, outputs, live activity, risks, approvals, next action.

## Performance

Initial paint uses light snapshots. `MissionControlClient` / shell is dynamically imported — AI Runtime, factories, skills, build, and deployment providers are not required on first paint.
