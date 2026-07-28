# Authorization (Program 6020)

Policies return `{ allowed, reason?, code? }`.

| Policy | Default |
|--------|---------|
| `CanCreateMission` | allow with actor + workspaceId |
| `CanApproveDecision` | deny viewers |
| `CanGenerateOutput` | allow authenticated |
| `CanStartBuild` | deny viewers |
| `CanCreatePreview` | allow authenticated |
| `CanApproveRelease` | owner/admin/founder |
| `CanDeployPreview` | allow authenticated |
| `CanDeployProduction` | **always deny** until explicit governance |
| `CanRollbackDeployment` | owner/admin/founder |

Production deploy stays disabled by default.
