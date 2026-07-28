# Arquitectura — Self Evolution Engine

## Flujo de governance

```
Executive Mesh → Capability Layer → Skills → Runtime → Approval Layer → Git Branch → Tests → Review → Merge
```

## Capas

| Módulo | Responsabilidad |
|--------|-----------------|
| `observation-engine` | Monitor build, runtime, mesh, AI, skills, etc. |
| `improvement-engine` | Orquesta detección → propuesta |
| `proposal-engine` | Crea propuestas con metadata completa |
| `roadmap-engine` | Roadmap interno de mejoras |
| `branch-manager` | Propone branches (dry-run) |
| `pr-generator` | Propone PRs (dry-run) |
| `executive-review` | Simula flujo CEO → Board → Approval |

## Motores especializados

- `technical-debt-engine`
- `performance-engine`
- `ux-engine`
- `product-engine`
- `security-engine`
- `documentation-engine`
- `architecture-review`
- `dependency-review`
- `code-health`
- `quality-review`

## UI (FHIS)

- `SelfEvolutionDashboard` — `/self-evolution`
- `SelfEvolutionLabView` — `/lab/self-evolution`

## Dependencias

Solo interfaces públicas vía `@/lib/self-evolution`. Sin dependencias circulares entre motores — todos dependen de `types.ts`.
