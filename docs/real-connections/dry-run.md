# Dry-Run Mode

## Default behavior

Every connection operation defaults to `dry_run` unless explicitly overridden with full governance clearance.

## What dry-run does

1. Builds an execution plan with steps and estimated duration
2. Generates rollback steps for reversible operations
3. Optionally performs read-only API calls (list repos, zones, projects)
4. **Never** performs mutations (create, update, delete, deploy, DNS change)

## API

```http
POST /api/connections/dry-run
Content-Type: application/json

{
  "provider": "github",
  "operation": "create_repository",
  "ventureId": "demo-venture-vandl",
  "payload": { "name": "my-repo" }
}
```

## Capability integration

`executeCapabilityConnection` always passes `mode: "dry_run"` unless production gates are satisfied.
