# Executive Orchestration

Location: `lib/mission-control/executive-orchestration.ts`  
Adapter: `lib/mission-control/adapters/executive-mesh-adapter.ts`

## Visibility rules

Executive Council banner appears when:

- A **pending decision** is marked `important: true` (branding, architecture)
- Mission phase is **VALIDATE** or **DEPLOY**

## What users see

- Headline: "Consejo evaluando…"
- **Executive summary only** — no chain-of-thought, no internal mesh traces
- Department list: CEO, CTO, CMO, CFO, Legal

## What users do NOT see

- Full `processExecutiveMeshRequest` pipeline
- Debate engine internals
- Skills or capability execution chains

The adapter returns a lightweight snapshot; full mesh can be invoked later via dynamic import if needed.
