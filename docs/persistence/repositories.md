# Repository Reference

All repositories are accessed via factory functions in `lib/persistence/index.ts`.

## Factory functions

```typescript
import {
  getWorkspaceRepository,
  getOrganizationRepository,
  getUserRepository,
  getVentureRepository,
  getMemoryRepository,
  getKnowledgeRepository,
  getKnowledgeHubRepository,
  getTimelineRepository,
  getCeoDecisionRepository,
  getTaskRepository,
  getDepartmentRepository,
  getBuildContextRepository,
  getBuildDnaRepository,
  getRoadmapRepository,
  getDocumentRepository,
} from "@/lib/persistence";
```

## Base contracts

### `Repository<T>`

```typescript
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}
```

### Map-based repositories

Used for venture-scoped data (memory, build context, timeline):

```typescript
// Example: build context
const repo = getBuildContextRepository();
const ctx = await repo.getByVenture("venture_abc");
await repo.save(ctx);
```

## Per-domain APIs

### Workspace

```typescript
const repo = getWorkspaceRepository();
await repo.findByOwner(userId);
await repo.findByOrganization(orgId);
```

### User

```typescript
const repo = getUserRepository();
await repo.findByEmail("founder@example.com");
await repo.getPreferences(userId);
await repo.savePreferences(userId, prefs);
```

### Venture

```typescript
const repo = getVentureRepository();
await repo.findByWorkspace(workspaceId, ventureIds);
```

### Memory

```typescript
const repo = getMemoryRepository();
await repo.getByVenture(ventureId);
await repo.save(record);
```

### CEO Decisions

```typescript
const repo = getCeoDecisionRepository();
await repo.getByVenture(ventureId);
await repo.save(decision);
await repo.getCeoMemory();
await repo.saveCeoMemory(memory);
```

### Tasks

```typescript
const repo = getTaskRepository();
await repo.findByVenture(ventureId);
await repo.findByStatus("pending");
```

### Timeline

```typescript
const repo = getTimelineRepository();
await repo.getByVenture(ventureId);
await repo.appendEvent(event);
```

## Sync vs async usage

Existing code uses **sync** bridge functions for backward compatibility:

```typescript
// Sync (existing code)
import { getVentures, saveVenture } from "@/lib/store/ventures";

// Async (new code)
import { asyncGetVentures, asyncSaveVenture } from "@/lib/store/ventures";
```

Prefer async repository calls in new server components or API routes.

## Storage key constants

All keys are defined in `lib/persistence/types.ts` as `PERSISTENCE_KEYS`. Legacy keys from Sprint 1/2 are reused where possible to avoid data migration.
