# Parallelism

Parallel execution is allowed **only when dependencies are satisfied**.

The kernel does not implement a new scheduler. It uses **SchedulerPort** / **RuntimePort** (in-memory by default; wrappers prefer existing Runtime modules when present).

## Limits

- max concurrency
- max workspace count
- max provider calls
- max estimated cost

## Cancellation

When `policies.cancellationPropagates` is true, `cancel()` clears parallelism reservations and cancels mission tasks through the scheduler port.
