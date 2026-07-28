# Mission Control integration

## Before

`MissionControlExperience` stacked:

1. `MissionControlV2View` (overview + panels)
2. Full `MissionControlClient` / `MissionControlShell` (own toolbar, AutoPilotToggle, 3-column diagnostic chrome)

→ Duplicate Pause / Auto-continue, two “Mission Control” surfaces, diagnostic look.

## After

Single composition:

```
MissionControlNav (Mission | Studio | Review | Company)
MissionControlV2View
  Header: identity (ForgeOS), stage, live provenance, primary CTA (from VM)
  Info grid: objective / stage / next decision / next action
  Workspace:
    main → Conversation (MissionControlClient embedded)
    side → Workflow (real stage statuses) / Outputs / Live activity / Approvals / Risks
```

## Control ownership

| Control | Where | Mechanism |
|---------|-------|-----------|
| Pause / Resume / Auto-continue | Toolbar (once) | Existing session + `setAutoPilot` paths in shell |
| Autonomous pause/resume | `AutonomousBuildPanel` in embedded main | Existing autonomous handlers |
| Approvals gate | `MissionApprovalModal` | Existing handlers |
| Primary CTA | Header from `vm.primaryCta` | Read model only (links / routes) |

AutoPilotToggle strip is **hidden when embedded** to avoid duplicating toolbar Auto-continue.

## Routes kept

`/mission-control`, `/missions/[id]`, `/studio`, `/review`, `/company` — no `-v2-new` variants.

## Boundaries

- Client does not import composition root / repos / factories / workflow engine / capability executor.
- UI does not mutate `.forgeos/v2-store` directly; controls use existing shell commands.
- No Canonical Domain Model / 6010 changes.
