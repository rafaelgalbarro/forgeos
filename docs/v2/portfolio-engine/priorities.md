# Priority Model — Program 6110

Levels: `CRITICAL`, `HIGH`, `NORMAL`, `LOW`, `PAUSED`

Affects: queue ordering, worker assignment, background jobs, preview availability, build scheduling, AI budget, review urgency.

`CRITICAL` cannot bypass: security, approvals, resource limits, locks, workspace policy.

Implementation: `MultiVentureExecutor.orderQueue()` uses priority weights.
