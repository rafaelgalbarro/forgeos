# Recommendations Structure

## PairFounderRecommendation (STEP 4)

Each recommendation contains:

| Field | Description |
|-------|-------------|
| `recommendation` | Action to take |
| `rationaleSummary` | Brief justification (no private reasoning) |
| `expectedImpact` | What changes if followed |
| `confidence` | 0–100 score |
| `assumptions` | Explicit assumptions used |
| `risk` | Primary risk if ignored |
| `alternative` | Optional alternative path |

## Primary + alternatives

1. **Primary**: from `buildRecommendation()` — highest priority action
2. **Alternatives**: up to 2 from `proposeAlternatives()` with lower confidence

## Approval gate

Pair Founder proposes — it does **not** execute changes without user approval. Recommendations appear in CEO Insights panel; decisions resolve via Decision Center.

## Heuristic vs Real AI

- **Heuristic**: structured recommendations from phase, snapshots, contradictions
- **Real AI**: `compileCeoPrompt()` available when `ENABLE_REAL_AI=true`; heuristic content used as safe fallback

Implementation: `lib/pair-founder/recommendations.ts`
