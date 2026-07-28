# Persistence / Recovery

Store: `.forgeos/v2-store/application-state.json` (atomic write via `.tmp` rename).

Recovery probe in atlas runner:

1. Create mission + advance through workflow/GENERATE artifacts
2. Persist workflow, delivery snapshot, lineage
3. `resetCompositionRoot()` + `createCompositionRoot()` (simulates process restart)
4. Assert mission + workflow + lineage still present — **PASS** (`persistence_recovery`)

Not reconstructed from fixture on reload.
