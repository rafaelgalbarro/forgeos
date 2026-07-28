# Queries (Program 6020)

## Bus

`createQueryBus()` + `QueryHandler` + `execute(query)`.

## Queries

- `GetWorkspaceOverview`, `GetVentureOverview`
- `GetMissionOverview`, `GetMissionConversation`, `GetMissionTimeline`, `GetMissionDecisions`, `GetMissionOutputs`
- `GetOutputDetails`
- `GetCodebaseSummary`, `GetCodebaseTree`
- `GetBuildStatus`, `GetPreviewStatus`, `GetReleaseStatus`, `GetDeploymentStatus`
- `GetCompanyOperatingOverview`

## Read models (DTO)

`MissionOverviewView`, `MissionTimelineView`, `OutputCardView`, `OutputStudioView`, `CodebaseTreeView`, `BuildStatusView`, `PreviewStatusView`, `DeploymentStatusView`, `CompanyOverviewView`, …

UI should not need aggregates — only these views / snapshots.

Experience-layer light snapshots (Program 6060) live in `experience-snapshots.ts` and remain separate from the CQ query bus.
