# Versioning

Managed in `lib/creation-output/output-versioning.ts`.

## Version Format

Semver: `major.minor.patch` (e.g. `1.0.0`)

## Operations

- `bumpVersion(version, kind)` — minor or patch bump
- `createNewVersion(previous, overrides)` — New output record, links `previousVersionId`
- `compareVersions(a, b)` — Visual, functional, file, risk diff
- `getVersionHistory(missionId, type)` — All versions for type

## Comparison Output

`VersionComparison` includes:
- visualChanges
- functionalChanges
- affectedFiles
- affectedArtifacts
- risks
- scoreBefore / scoreAfter

## Rule

Never modify an approved version directly. Change requests create new versions.
