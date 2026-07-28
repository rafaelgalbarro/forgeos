# Forbidden Actions

Explicitly blocked in `execution-policy.ts`.

## Destructive patterns

- `delete`, `drop`, `destroy`, `purge`, `wipe`
- `remove_repo`

## Production patterns

- `push_main`, `push_to_main`, `merge_main`
- `production_deploy`, `production`
- `prod_table`
- Payload targets: `environment: production`, `target: production`
- Push/merge to `base: main`

## DNS patterns

- `apply_dns`, `dns_apply` — plan only, no real DNS apply

## Credential patterns

- `expose_token` — never expose tokens in API responses

## Enforcement

1. `isForbiddenAction()` checked at request build time
2. `forbidden_check` gate in execution-guard
3. Connection adapters remain in dry-run/sandbox by default
4. `ENABLE_REAL_EXECUTION=false` blocks real mode entirely
