# Forge Capability Layer

RC4.9 introduces the **Capability Layer** between Executive Mesh and Skills Framework.

## Critical rule

No Department, Worker, or AI invokes Skills directly. All requests ask for a **CAPABILITY**.

## Architecture

See [architecture.md](./architecture.md).

## Documentation index

- [Registry](./registry.md) — 36 capabilities across 8 categories
- [Resolver](./resolver.md) — auto-resolve skill, provider, policy
- [Planner](./planner.md) — execution plans with dependencies
- [Execution](./execution.md) — pipeline and sandbox mode
- [Observability](./observability.md) — telemetry, metrics, events
- [Integration](./integration.md) — Skills, Mesh, Runtime, Memory

## Lab

Open `/lab/capabilities` to visualize registry, resolver output, plans, and sample execution.
