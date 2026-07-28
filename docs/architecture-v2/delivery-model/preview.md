# Preview Registry

A Preview references **exactly one** Build.

## Exception

`VISUAL` previews may omit Build only when `visualNonExecutable: true`.

## Types

- `VISUAL`
- `LOCAL_SANDBOX`
- `REMOTE_PREVIEW`

Adapter: `lib/preview-runtime` → `adaptPreviewSandbox`.
