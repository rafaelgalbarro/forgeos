# Capability Integration

## Skills Framework

`lib/capabilities/adapters/skills-adapter.ts` calls `runSkillRequest` from `lib/skills/pipeline.ts`.

Direction: capabilities → skills (never reverse).

## Executive Mesh

`lib/capabilities/adapters/mesh-adapter.ts` exposes:

- `resolveCapabilityForTopic(topic)` — maps founder topics to capabilities
- `executeMeshCapabilityForTopic(topic, ventureId)` — full pipeline
- `executeMeshCapabilityRequest(params)` — explicit capability call

`lib/executive-mesh/executive-protocol.ts` imports mesh-adapter (not capabilities index) to avoid cycles.

Mesh engine uses `request_capability` action instead of `request_skill`.

## Runtime

`lib/capabilities/adapters/runtime-adapter.ts` — mirrors skills runtime adapter pattern.

## Memory / Decision Graph

`lib/capabilities/adapters/memory-adapter.ts` — writes via executive mesh intelligence adapter.
