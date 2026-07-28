# Engineering Governance — Program 4290

**PROGRAM 4290 — ENGINEERING GOVERNANCE & PARALLEL EXECUTION**

Documentation-only governance layer for multi-agent ForgeOS development. No runtime behavior changes.

## Index

| Document | Purpose |
|----------|---------|
| [ownership-map.md](./ownership-map.md) | Team ownership by `lib/` and `app/` area |
| [protected-core.md](./protected-core.md) | Paths that require Architecture Owner approval |
| [parallel-execution-matrix.md](./parallel-execution-matrix.md) | Which programs can run in parallel |
| [dependency-graph.md](./dependency-graph.md) | System dependency chains |
| [folder-ownership.md](./folder-ownership.md) | Per-folder owner, scope, and edit rules |
| [safe-zones.md](./safe-zones.md) | One agent per zone at a time |
| [merge-policy.md](./merge-policy.md) | Merge queue and conflict rules |
| [agent-playbook.md](./agent-playbook.md) | Pre-edit checklist for agents |
| [build-policy.md](./build-policy.md) | Who may run build / reset:dev |
| [release-governance.md](./release-governance.md) | Dev → Preview → Staging → Production |
| [multi-agent-workflow.md](./multi-agent-workflow.md) | End-to-end parallel delivery workflow |
| [status.json](./status.json) | Static metadata for engineering dashboard |

## Dashboard

- **Route:** `/engineering` (dev/metadata only — no engines)
- **Source:** `docs/engineering/status.json`

## Related governance

- [Master Program governance](../master-program/governance.md)
- [Pillar ↔ Program mapping](../master-program/pillar-program-mapping.md)
- [Delivery release process](../delivery/02_release_process.md)

## Status

**PROGRAM 4290 — ENGINEERING GOVERNANCE & PARALLEL EXECUTION COMPLETADO**
