# Legacy mapping — PROGRAM 6010

Adapters: `src/legacy/adapters/domain/`

| Mapper | Legacy source | Canonical target | Known gaps |
|--------|---------------|------------------|------------|
| `legacyMissionToCanonical` | `Mission` (mission-control) | Mission | No sessionStatus → defaults DRAFT |
| `legacyMissionSessionToCanonical` | `MissionSession` | Mission | Title inferred from intent |
| `canonicalMissionToLegacy` | Mission | Mission-like export | Drops session/conversation |
| `legacyArtifactToCanonical` | `MissionArtifact` | Artifact | preview/build/deployment → OTHER |
| `legacyOutputToCanonical` | `CreationOutput` | Output | payload/files/routes dropped |
| `legacyBuildToCanonical` | `CodeProject` | Codebase + synthetic Build | Build inferred; no logs |

Legacy consumers are **not** modified. Mapping is opt-in for future migration programs.
