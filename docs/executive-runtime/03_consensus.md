# Consensus Engine

## Module

`lib/intelligence/consensus-engine.ts`

## Input

Array of `BoardOpinion` from the board session.

## Process

1. Normalize votes (approve / reject / defer / conditional / neutral)
2. Apply member weights (CEO weighted slightly higher)
3. Compute weighted average confidence
4. Detect agreements vs disagreements
5. Emit final decision and minority opinions

## Consensus levels

| Level | Typical condition |
|-------|-------------------|
| `UNANIMOUS` | ≥95% aligned |
| `HIGH_CONSENSUS` | ≥75% |
| `MEDIUM_CONSENSUS` | ≥55% |
| `LOW_CONSENSUS` | ≥40% |
| `CONFLICT` | <40% |

## Output (`ConsensusResult`)

- `level`, `confidence`, `rationale`
- `finalDecision`
- `minorityOpinions`
- `agreements`, `disagreements`
- `memberWeights`

Consensus is deterministic (no LLM) — fast and reproducible.

## Persistence

Written to executive memory (`consensusHistory`) and decision graph (`Approved` or `Deferred` node).
