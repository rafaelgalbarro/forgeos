# Execution Modes

| Mode | Behavior |
|------|----------|
| `MANUAL` | Explicit approvals + ticks; no auto-run |
| `ASSISTED` | Human approvals; operator-driven advance |
| `AUTOPILOT` | Auto-advance after approvals (still no production activate) |
| `DRY_RUN` | Fixtures only; auto-approve allowed; deterministic |
| `PREVIEW_ONLY` | Preview path only; production never activated |

**Invariant:** Production is never auto-activated by the kernel or deployment adapter fixtures (`productionActivated: false`).
