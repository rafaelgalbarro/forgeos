# Improvement Engine

Orquestador principal del ciclo de mejora.

## Pipeline

1. `runObservationEngine()` — recolectar señales
2. `createProposals()` — generar propuestas
3. `createRiskAssessment()` / `createTechnicalPlan()` — artefactos de ejecución
4. `proposeBranches()` / `proposePullRequests()` — git dry-run
5. `simulateAllExecutiveReviews()` — flujo ejecutivo
6. `computeHealthScore()` — score agregado

## API

```ts
import { runSelfEvolutionEngine, runSelfEvolutionLab } from "@/lib/self-evolution";

const snapshot = runSelfEvolutionEngine();
const lab = runSelfEvolutionLab();
```

## Output

`SelfEvolutionSnapshot` con propuestas abiertas, aprobadas, en progreso, completadas, feed de observaciones, ROI y riesgo agregados.
