# Cleanup

## Automatic

On sandbox stop:
- Kill child process (`taskkill` on Windows, `SIGTERM` elsewhere)
- Clear PID from store

## Manual — "Limpiar sandbox"

1. Stop process
2. Delete `node_modules/` and `.next/` in sandbox workspace
3. Optional full remove: delete entire temp dir
4. Status → `EXPIRED` on full cleanup

## Logs Retained

Log buffer kept in `sandbox-store` even after workspace cleanup (up to 5000 entries).

## Orphan Detection

E2E verification checks ports 3100+ for orphans after cleanup.

## TTL

Default sandbox TTL: 30 minutes (`SANDBOX_TTL_MS`).

Expired sandboxes can be restarted with new `PENDING` state.
