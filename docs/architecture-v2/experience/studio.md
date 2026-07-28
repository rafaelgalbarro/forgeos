# Studio V2 — PROGRAM 6060

## Routes

- `/studio` — hub (pick mission)
- `/studio/[missionId]` — section map + Creation Output Studio (existing 5350 client)
- `/studio/[missionId]/[section]` — Company, Brand, Website, Web App, Mobile, Backend, Data, Code, Build, Preview, Release, Deployment

Static `code` and `preview` routes remain for dedicated editors/sandboxes.

## Rules

- Studio is **not** duplicated inside Mission Control
- Visualizations use **dynamic imports** (on-demand)
- Code editor may limit usability on mobile

## Data

`GetStudioSections` → `StudioHubVM`
