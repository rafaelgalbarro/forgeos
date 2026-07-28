# Preview Runtime — PROGRAM 5370

Sandboxed Preview Runtime executes Program 5360 generated code projects in isolated environments with real previews.

## Features

- Isolated sandbox per project (Docker preferred, child process fallback)
- Real `npm install` + `npm run build` + dev server
- Localhost-only preview URLs (`http://127.0.0.1:<port>`)
- Build/runtime logs, error parsing, repair plans
- Resource limits, command allowlist, path guard
- Studio integration + lab console

## Routes

| Route | Purpose |
|-------|---------|
| `/studio/[missionId]/preview` | Preview sandbox per mission output |
| `/lab/preview-runtime` | Engineering lab + E2E NEXORA |

## API

- `GET /api/preview-runtime` — list sandboxes
- `POST /api/preview-runtime/start` — start sandbox
- `POST /api/preview-runtime/stop` — stop sandbox
- `GET /api/preview-runtime/[id]` — sandbox status
- `GET /api/preview-runtime/[id]/logs` — paginated logs
- `GET /api/preview-runtime/docker` — Docker detection
- `POST /api/preview-runtime/e2e` — NEXORA E2E verification

## Security

- NO execution inside ForgeOS main process
- NO shared `node_modules` with ForgeOS
- NO `.env.local` copy — manifest vars only
- NO public host exposure
- NO arbitrary shell commands

See [sandbox-strategy.md](./sandbox-strategy.md) and [security.md](./security.md).
