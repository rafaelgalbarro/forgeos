# Component map — Mission Control experience fix

| Surface | File | Role after fix |
|---------|------|----------------|
| Page `/mission-control` | `app/mission-control/page.tsx` | Loads VM + snapshot → `MissionControlExperience` |
| Page `/mission-control/[id]` | `app/mission-control/[missionId]/page.tsx` | Same, mission-scoped |
| Page `/missions/[id]` | `app/missions/[missionId]/page.tsx` | `MissionPageView` (overview uses V2 panels, no stacked shell) |
| Page `/review` | `app/review/page.tsx` | Approvals/risks read model (not second MC) |
| Experience root | `components/experience/MissionControlExperience.tsx` | **Single composition**: Nav + V2View + embedded conversation |
| Nav | `components/experience/MissionControlNav.tsx` | Mission · Studio · Review · Company |
| V2 view | `components/experience/MissionControlV2View.tsx` | Header + info grid + workspace (workflow/outputs/activity/approvals/risks) |
| Status helper | `components/experience/mc-status.ts` | Normalize tones + CTA from read model |
| Client | `components/mission-control/MissionControlClient.tsx` | `embedded` prop |
| Shell | `components/mission-control/MissionControlShell.tsx` | Embedded: conversation + toolbar + autonomous + outputs; no duplicate autopilot/side chrome |
| Toolbar | `components/mission-control/MissionControlToolbar.tsx` | Pause / Auto-continue / decisions (once) |
| Tokens | `lib/design-system/css/tokens.css` | FHIS aliases + `--mc-*` |
| MC CSS | `styles/fhis/mission-control.css` | Layout + contrast |
| Presentation adapter | `src/presentation/adapters/mission-query-adapter.ts` | LIVE stages/approvals/CTA; no inferred completed |
| VM types | `src/presentation/view-models/types.ts` | `planStages`, `primaryCta` |
