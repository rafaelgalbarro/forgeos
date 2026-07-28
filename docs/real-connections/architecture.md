# Architecture

## Layer stack

```
User / Lab UI
    ↓ (API routes only)
lib/connections/
    ├── security/     policy, audit, credentials, redaction
    ├── shared/       types, base adapter, context
    ├── github/       client + adapter
    ├── supabase/     client + adapter
    ├── vercel/       client + adapter
    ├── cloudflare/   client + adapter
    └── adapters/     capability-connection-adapter
         ↓
lib/capabilities/     runCapabilityRequest pipeline
         ↓
lib/skills-governance/ risk, approval, policy, guard
```

## Flow

1. **Capability request** enters `runCapabilityRequest`
2. **Governance** resolves approval, sandbox, policy via skills layer
3. **Connection adapter** maps capability → provider (dry-run default)
4. **Audit** records every attempt with redacted output
5. **Memory / decision graph** updated via existing capability executor

## Adapter pattern

Each provider extends `BaseConnectionAdapter`:

- `validateConnection` — read-only credential check
- `buildPlan` — generate step plan
- `dryRun` — simulate without mutations
- `executeReal` — blocked in RC5 unless all gates pass
- `buildRollbackPlan` — reversible step definitions
