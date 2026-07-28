# Persistence Adapters

## Overview

| Adapter | File | Status | Requires |
|---------|------|--------|----------|
| **local** | `adapters/local-adapter.ts` | Production-ready | Browser only |
| **supabase** | `adapters/supabase-adapter.ts` | Ready (REST) | `SUPABASE_URL` + anon key |
| **postgres** | `adapters/postgres-adapter.ts` | Stub | `DATABASE_URL` + API routes |

## Local adapter (default)

Works without any configuration. Uses:

- `localStorage` for payloads under 512 KB
- IndexedDB (`forgeos-persistence`) for larger payloads

```env
PERSISTENCE_PROVIDER=local
# or omit entirely — local is the default
```

## Supabase adapter

Uses PostgREST via `fetch`. Writes to local cache first, then syncs to remote.

### Setup

1. Create a `forgeos_entities` table in Supabase:

```sql
CREATE TABLE forgeos_entities (
  storage_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE forgeos_entities ENABLE ROW LEVEL SECURITY;
-- Add RLS policies per your auth model
```

2. Configure environment:

```env
PERSISTENCE_PROVIDER=supabase
NEXT_PUBLIC_PERSISTENCE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

3. Restart the dev server.

### Optional: @supabase/supabase-js

The adapter uses raw `fetch` against PostgREST. You can optionally install `@supabase/supabase-js` for realtime subscriptions in a future sprint — the repository layer does not require it.

### Sync behavior

```typescript
import { syncToRemote, syncFromRemote, startBackgroundSync } from "@/lib/persistence";

// Manual sync
await syncToRemote();
await syncFromRemote();

// Background sync (30s interval)
startBackgroundSync();
```

## Postgres adapter (stub)

Client-side code continues using local storage as cache. Server-side API routes can be added to proxy `DATABASE_URL` operations.

```env
PERSISTENCE_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@localhost:5432/forgeos
```

Future API routes (not yet implemented):

```
GET    /api/persistence/:key
PUT    /api/persistence/:key
DELETE /api/persistence/:key
```

## Switching providers

### Local → Supabase

1. Set `PERSISTENCE_PROVIDER=supabase` and Supabase credentials.
2. Start the app — existing local data remains in localStorage.
3. Call `syncToRemote()` to push local data to Supabase.
4. On other devices, call `syncFromRemote()` to pull.

### Supabase → Local

1. Call `syncFromRemote()` to ensure local cache is current.
2. Set `PERSISTENCE_PROVIDER=local`.
3. Data remains in localStorage.

## Provider detection

```typescript
import { resolveActiveProvider, getPersistenceProvider } from "@/lib/persistence";

const configured = getPersistenceProvider();   // what .env says
const active = resolveActiveProvider();         // what actually runs (with fallback)
```

If `PERSISTENCE_PROVIDER=supabase` but credentials are missing, the system silently falls back to `local`.

## Recovery

```typescript
import { scanForCorruption, repairCorruptedKeys, exportAllData, importAllData } from "@/lib/persistence";

const report = await scanForCorruption();
await repairCorruptedKeys();

const backup = await exportAllData();
await importAllData(backup);
```
