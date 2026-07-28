# Multi-Venture Simulation

Fixtures for 1, 5, 10, 25, 100 venture summaries (not full projects).

## Operational Test Scenario

3 concurrent missions:

- Mission A (venture-1): INTERACTIVE, succeeds
- Mission B (venture-2): STANDARD, fails
- Mission C (venture-3): BACKGROUND, paused

Validates: UI responsiveness, isolation, fairness, resource limits, failure doesn't block others.

Implementation: `src/core/performance/fixtures/multi-venture-simulation.ts`
