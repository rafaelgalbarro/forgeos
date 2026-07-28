# Architecture Compliance — PROGRAM 6080

**Governance refs:** [`../file-ownership-matrix.md`](../file-ownership-matrix.md), [`../integration-checklist.md`](../integration-checklist.md), [`../freeze-rules.md`](../freeze-rules.md)

## Program inventory (honest)

| Program | Name | Status | Evidence |
|---------|------|--------|----------|
| 6000 | Architecture Audit & Freeze | PARTIAL | `docs/architecture-v2/**` |
| 6010 | Canonical Domain | PARTIAL / STUB | `src/core/domain/**`, README: thin stubs; legacy `lib/*` SoT |
| 6020 | Application CQRS | FAIL (build) | Handlers + ports/index exist; `ports.ts` stub breaks exports → next build FAIL |
| 6030 | Orchestration Kernel | PARTIAL | Planning/workflow/ports; ESTIMATED / DRY_RUN defaults |
| 6040 | Events & State | PARTIAL | `src/core/events/**` catalogs + state machines |
| 6050 | Delivery model | PARTIAL | `src/core/delivery/**` + lineage docs; in-memory registries |
| 6060 | Experience layer | PARTIAL | `src/presentation/**`, `app/company/**` |
| 6070 | Migration | PARTIAL | `src/core/migration/**`; all V2 flags default OFF |
| 6080 | Certification | THIS PACKAGE | scripts + this folder |

## Compliance findings

1. **Ownership matrix respected for certification artifacts** — reports under `docs/architecture-v2/certification/**`, scripts `certify*` / `run-v2-certification*`.
2. **Integration wave incomplete** — `architecture:check`, `typecheck`, `test` not wired in `package.json` (integration owns these).
3. **SoT not flipped** — migration flags default false; domain README states legacy remains authoritative. Compliant with freeze guidance; not product-complete.
4. **Dual surfaces** — delivery V2 + legacy creation-output / mission-control coexist; dual-write not proven live.
5. **No false “V2 implemented” claim** — migration matrix explicitly forbids declaring Architecture V2 done after 6000 alone; 6080 concurs: **BLOCKED**.

## Architecture:check

**MISSING** as npm script. Nearby related tooling: `scripts/check-quality-gates.js` (not wired as `architecture:check`). Documented `scripts/check-canonical-redefinition.js` referenced in integration checklist — verify presence before claiming PASS.
