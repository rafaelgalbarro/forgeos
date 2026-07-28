# Idempotency

Side-effecting listeners (deploy, output generation, etc.) must register processing:

```ts
ProcessedEventRegistry → key (handlerId, eventId)
handleIdempotently(registry, handlerId, event, handler)
```

Retries that already succeeded are **skipped** — prevents duplicate deploy/output.

Canonical bus: `subscribeIdempotent(handlerId, eventType, handler)`.
