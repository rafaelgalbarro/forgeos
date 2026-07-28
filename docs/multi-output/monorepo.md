# Monorepo Option

Not imposed on small projects. Recommended when ≥6 active outputs.

## Structure

```
apps/website
apps/web
apps/mobile
apps/api
packages/ui
packages/contracts
packages/config
packages/types
packages/analytics
```

Triggered by `suggestMonorepoStructure()` in shared-context when Build DNA complexity warrants it.

## When NOT to Use

- Corporate web-only (website + brand)
- Restaurant (website + booking)
- Single-output missions

## Design Token Package

Generated code in `packages/ui/tokens/` does NOT import ForgeOS FHIS.
