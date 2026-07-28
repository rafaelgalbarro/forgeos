# Capability Observability

## Telemetry

`appendCapabilityTelemetry` records per-call: capabilityId, skillId, provider, latency, cost, success, sandboxMode.

## Metrics

`updateCapabilityMetrics` aggregates success rate, avg latency, avg cost per capability.

## Events

`emitCapabilityEvent` tracks pipeline stages (request, route, resolve, plan, complete).

## History

`recordFromCapabilityResult` writes venture-scoped memory records to `capabilityHistory`.

## Audit

`appendCapabilityAudit` stores audit logs in `capabilityStore` composite structure.

## Lab visualization

`/lab/capabilities` shows registry KPIs, resolver output, execution plan, telemetry, and metrics.
