# Decision Graph Visualizer

## Flow (vertical)

Founder → CEO → Board → Consensus → Decision → Memory → Portfolio → Build

- **Build** node is disabled (Epic 3.3 placeholder)
- Clickable nodes linked to `ExecutiveGraphNode` records when available

## Node detail panel

On click: title, type, confidence, impact, reversible, dependencies, rationale, technical JSON toggle.

## Data

`getExecutiveGraphForVenture(ventureId)` via `lib/lab/executive-runtime-lab.ts`

## Component

`components/lab/mission-control/DecisionGraphVisualizer.tsx`
