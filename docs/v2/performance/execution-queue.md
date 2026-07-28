# Execution Queue

Reuses existing Runtime/Scheduler/Task Queue. Adds load planning layer only.

## Task Priorities

INTERACTIVE > HIGH_PRIORITY > STANDARD > BACKGROUND > LOW_PRIORITY > MAINTENANCE

## Features

- Priority ordering
- Concurrency limits per workspace/venture
- Timeout, retry, cancellation
- Pause support
- Fairness via priority queue

## API

- `enqueueTask()` — add to queue
- `planNextTask()` — select next runnable task
- `startPlannedTask()` — begin execution
- `completeTask()` / `cancelTask()` — finish

Implementation: `src/core/performance/queue/load-planner.ts`
