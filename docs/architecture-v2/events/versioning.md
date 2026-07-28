# Versioning

- Every envelope has `eventVersion`.
- Upcasters live in `src/core/events/versioning/`.
- `isCompatibleVersion(eventVersion, readerVersion, hasUpcaster)`.
- `DEPRECATED_EVENT_MAPPINGS` maps legacy runtime names → canonical types without deleting history.
- Default pipeline: `defaultUpcasterPipeline` (deprecated map + MissionStateChanged v1→v2 example).

Original payloads remain available via `originalPayload` / `sourceEventRef`.
