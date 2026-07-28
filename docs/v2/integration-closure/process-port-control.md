# Process and Port Control

**Modules:**

- `scripts/lib/process-registry.js`
- `scripts/lib/port-registry.js`
- `scripts/lib/process-cleanup.js`
- `scripts/kill-ports.js` (updated)

## kill:ports flow

1. Read ForgeOS process/port registries
2. Verify ownership
3. Kill only registered PIDs
4. Optionally reclaim orphans whose command line includes this workspace + `next`
5. Verify required ports free
6. Clean registry entries
7. Nonzero exit if required port still stuck by foreign PID

No indiscriminate kill-by-name.

## Dev registration

`scripts/dev.js` and `scripts/dev-reset.js` register PID+port on spawn and unregister on exit.
