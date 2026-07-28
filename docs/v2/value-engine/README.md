# PROGRAM 6120 — Venture Value Creation Engine

**Status:** Implemented  
**Scope:** Distinguish ventures that only generate deliverables from those that advance validation, launch readiness, traction, or revenue — without inventing metrics.

## Non-negotiable rules

- No invented revenue, customers, or metrics
- No vanity metrics as proven value
- No converting ESTIMATED/PROJECTED/TARGET into ACTUAL
- No single opaque score
- No automatic irreversible decisions (`PAUSE`, `PIVOT`, `MERGE`, `CLOSE`)
- Do not start Program 6130 from this package

## Package map

| Layer | Path |
|-------|------|
| Domain | `src/core/domain/value/` |
| Application | `src/core/application/value-engine/` |
| Fixture | `src/core/composition/fixtures/rafael-ventures-lab.ts` |
| Docs | `docs/v2/value-engine/` |

## Doc index

- [value-model.md](./value-model.md)
- [dimensions.md](./dimensions.md)
- [stages.md](./stages.md)
- [evidence.md](./evidence.md)
- [metrics.md](./metrics.md)
- [milestones.md](./milestones.md)
- [experiments.md](./experiments.md)
- [assessment.md](./assessment.md)
- [recommendations.md](./recommendations.md)
- [economics.md](./economics.md)
- [snapshots.md](./snapshots.md)
- [portfolio-comparison.md](./portfolio-comparison.md)
- [certification.md](./certification.md)
- [final-report.md](./final-report.md)

## Commands

`CreateValueHypothesis`, `RegisterValueEvidence`, `CreateValueMetric`, `UpdateValueMetric`, `CreateValueMilestone`, `StartValueExperiment`, `CompleteValueExperiment`, `CreateValueAssessment`, `CreateValueSnapshot`, `RequestValueReview`, `ApproveValueRecommendation`, `RejectValueRecommendation`

## Queries

`GetVentureValueSummary`, `GetVentureValueDetail`, `GetValueEvidence`, `GetValueMilestones`, `GetValueExperiments`, `GetVentureEconomics`, `GetValueRecommendations`, `ComparePortfolioVentures`, `GetPortfolioValueSummary`
