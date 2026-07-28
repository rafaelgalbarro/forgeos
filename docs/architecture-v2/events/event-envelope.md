# Event Envelope

Canonical shape (`DomainEventEnvelope`):

| Field | Purpose |
|-------|---------|
| `eventId` | Unique id |
| `eventType` | Catalog type string |
| `eventVersion` | Payload/schema version |
| `catalogKind` | `domain` \| `application` \| `integration` \| `telemetry` \| `ui_notification` |
| `aggregateType` / `aggregateId` | Aggregate identity |
| `workspaceId` | Tenant isolation |
| `missionId?` | Optional mission scope |
| `correlationId` / `causationId` | Trace chain |
| `actor` | Who caused the change |
| `occurredAt` | ISO timestamp |
| `payload` | JSON-safe business data (**no CoT**) |
| `metadata` | Opaque primitives |
| `originalPayload?` | Preserved legacy body during transition |
| `sourceEventRef?` | Pointer to original bus/history id |

Aligns with PROGRAM 6010 `DomainEventBase` via `envelopeFromLegacyDomainEvent` / `createDomainEventEnvelope`.

Forbidden payload keys include: `chainOfThought`, `cot`, `reasoning`, `rawPrompt`, `apiKey`, `password`, `token`, etc.
