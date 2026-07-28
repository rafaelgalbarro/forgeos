# Consensus

## Engine

Reuses `lib/intelligence/consensus-engine` via `orchestration-adapter`.

## Flow

1. Executive Board session produces `BoardOpinion[]`
2. `buildConsensus(opinions)` → level, confidence, finalDecision
3. On `CONFLICT` → Disagreement Engine escalates to CEO
4. `writeConsensusDecision` → Decision Graph node

## Levels

- `STRONG` — proceed
- `MODERATE` — proceed with conditions
- `WEAK` — defer
- `CONFLICT` — CEO arbitration required

Never resolve arbitrarily — CEO must arbitrate unresolved conflicts.
