# Consensus Module

## Display

- **Consensus Meter** — visual bar + `Progress` component
- **Level** — UNANIMOUS / HIGH_CONSENSUS / MEDIUM_CONSENSUS / LOW_CONSENSUS / CONFLICT
- **Final decision** + rationale
- **Vote counts** — a favor, reservas, desacuerdos (derived from vote strings)
- **Minority opinions** when present

## Interaction

"Ver debate completo" shows `AiConversation` replay of board positions plus consensus JSON.

## Engine

`lib/intelligence/consensus-engine.ts` — `buildConsensus(opinions)`

## Component

`components/lab/mission-control/ConsensusPanel.tsx`
