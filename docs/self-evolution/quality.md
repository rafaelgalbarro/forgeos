# Quality

## Motores de calidad

| Motor | Métrica |
|-------|---------|
| `code-health` | Duplicados, imports muertos, TODO/FIXME |
| `quality-review` | Agregación de code health + deps + arch |
| `architecture-review` | Circular deps, layer violations |
| `dependency-review` | Outdated, unused, vulnerabilities |
| `improvement-score` | Health score global 0-100 |

## Health Score

Dimensiones: código, rendimiento, UX, seguridad, documentación, arquitectura.

## Quality gates del programa

1. `npm run build` — exit 0
2. `npm run reset:dev`
3. HTTP 200 en `/`, `/os`, `/live`, `/dashboard`, `/self-evolution`, `/lab/self-evolution`

## Tests de propuesta

Cada `TechnicalPlan` incluye `testChecklist` y `executionChecklist` generados heurísticamente.
