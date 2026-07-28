# 07 — Startup Portfolio

## Definición

**Startup Portfolio** es la capacidad de ForgeOS para gestionar **múltiples ventures** simultáneamente como un venture studio: estados, métricas, documentos, código, decisiones y versiones.

## Estado v0.1

| Capacidad | Estado |
|-----------|--------|
| Lista de proyectos (`/projects`) | Implementado |
| Persistencia localStorage | Implementado |
| Estados formales por venture | Parcial (implícito) |
| Métricas agregadas | No |
| Repos vinculados | No |
| Versionado de decisiones | No |

## Modelo de venture en portfolio

```
Portfolio (workspace)
└── Venture[]
    ├── identity (id, name, category)
    ├── stage (timeline)
    ├── health (scores, last activity)
    ├── artifacts (sections, exports)
    ├── decisions[]
    ├── versions[]
    └── links (repo, deploy, analytics) [futuro]
```

## Estados del venture

| Estado | Descripción |
|--------|-------------|
| `draft` | Idea capturada, sin Intelligence completa |
| `evaluating` | Intelligence / Simulator en curso |
| `validated` | Decisión positiva, pre-build |
| `building` | Workers ejecutados, workspace activo |
| `mvp` | MVP definido / en construcción externa |
| `live` | Lanzado con usuarios |
| `paused` | Congelado por decisión CEO/usuario |
| `archived` | Histórico, no activo |
| `pivoted` | Continuación con nuevo branch de DNA |

## Dimensiones gestionadas

### Documentos

- Secciones Venture Workspace
- Exports (Brief, PRD, Research, Build Plan, etc.)
- Board minutes (futuro)

### Métricas (futuro)

| Tipo | Ejemplos |
|------|----------|
| Forge-native | Venture Score, Discovery completeness |
| Product | Usuarios, retención (integración externa) |
| Business | MRR, churn (manual o Stripe) |
| Engineering | Deploy status, test coverage (GitHub) |

> *Hipótesis:* Métricas externas se importan, no se inventan.

### Código

| v0.1 | v5.0+ |
|------|-------|
| Build Plan + prompts | Repo vinculado por venture |
| Export ZIP | Sync con GitHub / Forge Cloud |

### Decisiones

Cada entrada en Decision Log referencia:

- ventureId
- gate (pre-build, pivot, etc.)
- recommendation vs acción usuario
- timestamp

### Versiones

| Objeto | Versionado |
|--------|------------|
| PRD | v1, v2… en DNA |
| Research | Re-run marca nueva versión |
| Build Plan | Regeneración explícita |
| Simulator | Snapshot por fecha |

## Vista Portfolio (visión v4.0)

| Columna | Contenido |
|---------|-----------|
| Venture | Nombre + categoría |
| Stage | Timeline badge |
| Score | Venture Score actual |
| CEO priority | Ranking |
| Next action | Research / Build / Pause |
| Last activity | Fecha |

## AI CEO en portfolio

- Máximo N ventures "activos" según plan
- Recomendación de pausar ventures de bajo score
- Alertas: "3 ventures en building — riesgo de dispersión"

## Principios

1. **Un workspace, muchos ventures** — no multi-tenant complejo en v1
2. **Archivar sin borrar** — historial para aprendizaje
3. **Priorización visible** — el portfolio sin ranking es caos
4. **Export por venture** — nunca mezclar artefactos

## Referencia código

- `lib/domain/venture.ts`
- Persistencia ventures en localStorage
- `/projects` — lista básica
