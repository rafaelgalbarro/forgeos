# Learning Engine

Captures organizational learning from venture progression using heuristics.

## LearningSnapshot

Per venture:

- `lessonsLearned` — positive observations (e.g. discovery improves scores)
- `bestPractices` — recommended workflows
- `repeatedMistakes` — anti-patterns detected
- `recommendedActions` — next steps derived from state

## Triggers

`updateLearningFromVenture(venture)` runs on every `syncVentureMemory`.

## Heuristics

| Condition | Output |
|-----------|--------|
| ≥3 discovery answers | Lesson: discovery improves decisions |
| <3 discovery answers | Mistake: partial discovery underestimates risk |
| Research without PRD | Action: generate PRD |
| Simulator score ≥70 | Lesson: good product-market fit signal |
| Simulator says research_more | Action: deepen research |
| Simulator says build/MVP | Practice: prioritize scoped MVP |
| >21 days in intelligence without build | Mistake: prolonged stall |

## Storage

`forgeos-intelligence-learning` — map keyed by `ventureId`.
