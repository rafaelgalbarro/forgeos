# Versioning

## Mission Release

Coordinated release `0.1.0` referencing all component versions:

```typescript
interface MissionReleaseVersion {
  release: "0.1.0";
  components: { VENTURE: "0.1.0", WEBSITE: "0.1.0", ... };
  partial: boolean; // true if any output failed
}
```

## Partial Release

Allowed when justified — failed outputs don't block successful ones.

## Release Package

`MultiOutputReleasePackage` includes:
- manifest, outputs, versions, artifacts
- source code references, previews
- validation results, approvals
- deployment plans (dry-run), rollback plans, docs

Built by `buildReleasePackage()` in output-coordinator.
