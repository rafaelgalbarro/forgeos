# Error Handling

## Categories

`dependency`, `typescript`, `syntax`, `import`, `build`, `route`, `runtime`, `hydration`, `network`, `environment`, `timeout`, `security`

## Parser

`error-parser.ts` scans stdout/stderr for patterns and extracts file:line when possible.

## Normalizer

`error-normalizer.ts` strips ANSI codes, normalizes paths, groups by category.

## Repair Plan

On failure, `repair-plan.ts` generates:

- Cause
- Affected files
- Suggested change
- Risk level
- `approvalRequired: true`
- `autoApply: false`

Integrated with `lib/creation-output/change-requests.ts`.

## UI

- Build Logs tab (install + build phases)
- Runtime Logs tab
- Errors panel (top 5 with file/line)
- Warnings list
- Repair Plan card
