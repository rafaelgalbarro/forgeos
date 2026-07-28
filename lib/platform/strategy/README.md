# Strategy Pillar

Discovery, founder advisory, research and venture simulation.

## Modules

| Module | Adapter | Target lib |
|--------|---------|------------|
| Discovery | `discovery.adapter.ts` | `@/lib/discovery` |
| Founder Advisor | `founder-advisor.adapter.ts` | `@/lib/intelligence` |
| Research | `research.adapter.ts` | `@/lib/ai` (types) |
| Simulator | `simulator.adapter.ts` | `@/lib/venture-simulator` |

## Status

`scaffold` — engine returns stubs; adapters are type-only bridges.

## Rules

- No imports from other pillars.
- Runtime wiring deferred to future integration phase.
