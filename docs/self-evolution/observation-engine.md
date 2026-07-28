# Observation Engine

Monitorea subsystems de ForgeOS mediante heurísticas estáticas y datos demo.

## Categorías

- build, runtime, mesh, ai, skills, capabilities
- marketplace, enterprise, venture-factory
- logs, errors, warnings, performance, ux, feedback
- code-quality, routes, docs

## API

```ts
import { runObservationEngine } from "@/lib/self-evolution";
const observations = runObservationEngine();
```

## Señales demo obligatorias

1. Build lento (47s > umbral 30s)
2. Componente duplicado (78% similitud)
3. Ruta sin uso (/lab/rc1)
4. Oportunidad Founder (62% dropoff paso 2)

Cada señal incluye `heuristic: true` y `dryRun: true`.
