# PROGRAM 6150 — Scenario

Portfolio: **RAFAEL VENTURES LAB**

| # | Step | Expected |
|---|------|----------|
| 1 | Create five companies in batch | TABLEFLOW, LUXORA EYEWEAR, LOCALGROW AI, CREATORPULSE, ORBITA SPORTS |
| 2 | Start three simultaneously | TABLEFLOW, LUXORA EYEWEAR, LOCALGROW AI |
| 3 | Keep one in validation | CREATORPULSE → VALIDATING |
| 4 | Pause one | ORBITA SPORTS → PAUSED |
| 5 | Execute outputs | Delivery registry outputs for simultaneous ventures |
| 6 | Generate at least one real web | WEBSITE_OUTPUT + codebase files |
| 7 | Generate at least one real application | WEB_APPLICATION_OUTPUT |
| 8 | Generate backend | BACKEND_OUTPUT |
| 9 | Generate database schema | schema artifact + `init.sql` |
| 10 | Generate API contract | API artifact + `openapi.yaml` |
| 11 | Generate previews | PLAN_ONLY (sandbox unavailable — honest) |
| 12 | Register evidence | ValueEvidence with provenance |
| 13 | Create milestones | ValueMilestone per venture |
| 14 | Generate value snapshots | ValueSnapshot + assessVentureValue |
| 15 | Register one controlled failure | Injected failure on one simultaneous venture |
| 16 | Demonstrate failure isolation | Peers retain outputs |
| 17 | Create release candidate | ≥1 release via delivery.publishRelease |
| 18 | Create deployment plan | dryRun PREVIEW plan |
| 19 | Generate CEO Brief | Requires 6140; otherwise SKIPPED with gap |
| 20 | Generate recommendations | ValueRecommendation ADVISORY (+ CEO if present) |

Honesty markers:

- Preview: `PLAN_ONLY` when sandbox unavailable
- No invented revenue/customers
- Estimates never promoted to ACTUAL
