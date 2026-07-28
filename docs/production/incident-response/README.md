# Incident Response

## Severity levels

- **info** — Informational, no action required
- **warning** — Degraded performance, monitor
- **error** — User-facing impact, investigate within 1h
- **critical** — Outage, immediate response

## Workflow (stub)

1. Alert fires → `/alerts`
2. Create incident → `/incidents`
3. Advance status: open → investigating → mitigated → resolved → closed
4. Post-mortem in docs (manual)

## Escalation

- AI provider failures: check `/monitoring` AI panel
- Runtime issues: check `/health` runtime score
- Kill switch active: verify `ENABLE_KILL_SWITCH` env
