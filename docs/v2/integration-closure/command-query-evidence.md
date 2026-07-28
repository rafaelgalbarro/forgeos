# Command / Query Evidence

Source: `artifacts/v2-certification/atlas-clubs-run.json`

Commands exercised (real bus → handlers → UoW → disk):

- CreateWorkspace, CreateVenture, CreateMission
- UpdateMissionIntent
- PlanOutput / GenerateOutput (per capability artifact)
- GenerateCodebase
- RequestDecision / ResolveDecision
- CreateRelease

Queries:

- GetMissionOverview, GetMissionOutputs, GetMissionTimeline — PASS

UI mutations are not the SoT; application command bus is.
