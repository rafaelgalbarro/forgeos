# Release and Deployment

Release panel reports canonical release id/version/status.

Deployment panel reports:

- `PLAN_READY` for dry-run plans
- `BLOCKED_BY_CONFIGURATION` when real deployment cannot be asserted
- `NOT_CREATED` if no deployment record exists

The panel never reports a fake real deployment state.
