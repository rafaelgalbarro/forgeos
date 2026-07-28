# Program 2035 — ForgeOS Self Evolution Engine

Motor de auto-observación y mejora continua para ForgeOS. **Nunca auto-modifica código** — todas las propuestas requieren aprobación humana.

## Principios

- ForgeOS NEVER auto-modifies its own code
- NEVER auto-merge to main
- All proposals require human approval
- Git operations are simulation/dry-run only

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/self-evolution` | Dashboard principal |
| `/lab/self-evolution` | Lab harness de ingeniería |

## API pública

```ts
import { runSelfEvolutionEngine } from "@/lib/self-evolution";
const snapshot = runSelfEvolutionEngine();
```

## Caso de uso obligatorio

El engine detecta automáticamente:

1. Build lento (> 30s)
2. Componente duplicado (KpiBlock / MetricCard)
3. Ruta sin uso (`/lab/rc1`)
4. Oportunidad en flujo Founder

Y genera reporte, propuesta, plan técnico, riesgo, branch y PR (dry-run).

## Versión

`SELF_EVOLUTION_VERSION` = 2035.0.1
