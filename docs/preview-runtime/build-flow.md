# Build Flow

## States

```
PENDING → PREPARING → INSTALLING → BUILDING → STARTING → READY
                                              ↘ FAILED
                                              ↘ DEGRADED
```

## Build Results

| Status | Meaning |
|--------|---------|
| `BUILD_PASSED` | `npm run build` exit 0 |
| `BUILD_FAILED` | Non-zero exit |
| `BUILD_TIMEOUT` | Exceeded 300s |
| `BUILD_SKIPPED` | Mobile preview plan |

## Captured Data

- Exit code, stdout, stderr
- Duration (ms)
- Parsed errors (category, file, line)
- Warnings
- Routes from manifest
- Bundle size (when available)

## On Failure

1. Parse and classify errors
2. Generate Repair Plan (no auto-apply)
3. Link to change-requests if outputId present
4. Status → `FAILED`
