# ForgeOS Venture Persistence (Sprint 3)

Program 3000 Sprint 3 introduces a **Repository Pattern** persistence layer for all venture and workspace data. Components never access a database provider directly — they use existing stores, which delegate to bridge adapters backed by repositories.

## Quick start

Default mode works out of the box with **no external database**:

```bash
# .env.local (optional — local is the default)
PERSISTENCE_PROVIDER=local
```

Data is stored in `localStorage` with IndexedDB fallback for large payloads.

## Architecture

```
Components / Pages
       ↓
Existing stores (lib/workspace, lib/store/ventures, …)
       ↓
Bridge adapters (lib/persistence/bridges/)
       ↓
Repositories (lib/persistence/repositories/)
       ↓
Adapters (local | supabase | postgres)
```

## Persisted entities

| Entity | Repository | Storage key |
|--------|-----------|-------------|
| Workspace | `workspace-repository` | `forgeos-workspaces` |
| Organization | `organization-repository` | `forgeos-organizations` |
| User / Founder | `user-repository` | `forgeos-auth-users` |
| Ventures | `venture-repository` | `forgeos-ventures` |
| Memory | `memory-repository` | `forgeos-intelligence-venture-memory` |
| Knowledge | `knowledge-repository` | `forgeos-persist-knowledge` |
| Knowledge Hub | `knowledge-hub-repository` | `forgeos-persist-knowledge-hub` |
| Timeline | `timeline-repository` | `forgeos-persist-timeline` |
| CEO Decisions | `ceo-decision-repository` | `forgeos-intelligence-decisions` |
| Tasks | `task-repository` | `forgeos-persist-tasks` |
| Departments | `department-repository` | `forgeos-autonomous-organization` |
| Build Context | `build-context-repository` | `forgeos-persist-build-context` |
| Build DNA | `build-dna-repository` | `forgeos-persist-build-dna` |
| Roadmaps | `roadmap-repository` | `forgeos-persist-roadmaps` |
| Documents | `document-repository` | `forgeos-persist-documents` |

## Services

- **Autosave** — debounced writes (800 ms) via `scheduleAutosave()`
- **Sync layer** — push/pull between local cache and remote adapter
- **Recovery** — scan and repair corrupted localStorage keys
- **Snapshots** — point-in-time backups of venture state
- **Versioning** — per-entity version history for audit/rollback

## UI

```tsx
import { SyncStatusBadge } from "@/components/persistence/SyncStatusBadge";

<SyncStatusBadge />
```

## Switching providers

See [adapters.md](./adapters.md) for full provider configuration.

```env
# Local (default)
PERSISTENCE_PROVIDER=local

# Supabase REST
PERSISTENCE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Postgres (stub — requires API routes)
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgresql://...
```

## Further reading

- [architecture.md](./architecture.md) — design decisions and data flow
- [repositories.md](./repositories.md) — repository API reference
- [adapters.md](./adapters.md) — adapter configuration and migration
