# Value Model

Entities live under `src/core/domain/value/` and **extend** Venture/Mission by `ventureId` reference. They do not redefine those aggregates.

| Entity | Role |
|--------|------|
| `ValueHypothesis` | Falsifiable claim tied to a dimension |
| `ValueMetric` | Measured/estimated quantity with value type |
| `ValueEvidence` | Provenanced observation (origin required) |
| `ValueMilestone` | Target vs current with evidence requirements |
| `ValueExperiment` | Structured learning loop |
| `ValueAssessment` | Transparent dimension evaluation |
| `ValueRisk` / `ValueOpportunity` | Explicit risk/opportunity records |
| `ValueRecommendation` | Advisory action with approval gates |
| `ValueSnapshot` | Immutable point-in-time value state |
| `VentureEconomics` | Currency-aware economic fields |
| `VentureTraction` | Traction signals with value types |
| `CustomerEvidence` | Customer-linked evidence bridge |

Repository port: `ValueEngineRepository`.
