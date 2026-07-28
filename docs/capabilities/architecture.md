# Capability Layer Architecture

## Flow

```mermaid
flowchart LR
  F[Founder] --> CEO
  CEO --> EM[Executive Mesh]
  EM --> CL[Capability Layer]
  CL --> CR[Capability Resolver]
  CR --> SR[Skill Router]
  SR --> SK[Skill]
  SK --> PR[Provider]
  PR --> EX[Execution]
  EX --> RT[Runtime]
  RT --> MEM[Memory]
  MEM --> DG[Decision Graph]
```

## Layers

| Layer | Responsibility |
|-------|----------------|
| Capability Registry | Declares what the OS can do (business intent) |
| Capability Router | Routes request to category and skill pool |
| Capability Resolver | Auto-selects skill, provider, policy, approval |
| Capability Planner | Builds multi-step execution plan |
| Capability Executor | Runs plan via Skills adapter (sandbox) |

## Dependency direction

- `lib/capabilities` imports `lib/skills` (via adapter)
- `lib/executive-mesh` imports `lib/capabilities/adapters/mesh-adapter`
- `lib/skills` does **not** import `lib/capabilities`

## Storage keys

- `capabilityStore` — usage entries + audit logs
- `capabilityHistory` — execution memory records
- `capabilityTelemetry` — per-call telemetry
- `capabilityMetrics` — aggregated metrics
- `capabilityEvents` — pipeline stage events
