# ForgeOS Build Pipeline — Program 3000 Sprint 5

Pipeline unificado que conecta **GitHub**, **Supabase**, **Vercel**, la **capa de aprobación** y el **Real Build Flow** en un solo dashboard de despliegues.

## Principios

- **Nunca producción** — solo entornos `preview` / `sandbox` / `dry_run`
- **Dry-run por defecto** — `ENABLE_REAL_BUILD_FLOW=false`
- **Aprobación humana** — `REAL_BUILD_REQUIRE_APPROVAL=true`
- **Sin auto-merge** — operaciones destructivas bloqueadas

## Arquitectura

```
lib/build-pipeline/
├── pipeline-orchestrator.ts   # Orquestador principal
├── github-step.ts             # Adapter → lib/real-build-flow/github-step
├── supabase-step.ts           # Adapter → lib/real-build-flow/supabase-step
├── vercel-step.ts             # Adapter → lib/real-build-flow/vercel-step
├── migration-plan.ts          # Plan de migraciones Supabase
├── rollback-plan.ts           # Wrapper rollback real-build-flow
├── build-report.ts            # Informe consolidado
├── risk-assessment.ts         # Evaluación de riesgo
└── audit-trail.ts             # Auditoría unificada
```

## Flujo del pipeline

1. **Salud de conexiones** — verifica credenciales GitHub/Supabase/Vercel
2. **Puerta de aprobación** — valida política RC5.1
3. **Dry-run** — simula todos los pasos vía `lib/real-build-flow`
4. **Evaluación de riesgo** — skills governance + factores multi-proveedor
5. **Repositorio GitHub** — plan/creación repo privado (adapter)
6. **Proyecto Supabase** — sandbox + migraciones
7. **Proyecto Vercel** — preview deploy
8. **Plan deploy preview** — URL preview (nunca producción)
9. **Plan de migración** — archivos SQL sandbox
10. **Plan de rollback** — pasos de recuperación
11. **Informe de build** — resumen ejecutivo
12. **Auditoría** — trail unificado

## Entregables generados

| Entregable | Módulo |
|------------|--------|
| Repository Plan | `pipeline-orchestrator` |
| Project Plan (Supabase/Vercel) | `pipeline-orchestrator` |
| Deploy Preview Plan | `pipeline-orchestrator` |
| Migration Plan | `migration-plan.ts` |
| Rollback Plan | `rollback-plan.ts` |
| Build Report | `build-report.ts` |

## UI

- Dashboard: `/deployments`
- Componentes: `components/build-pipeline/`
- Labs relacionados: `/lab/real-build-flow`, `/lab/real-execution`

## API

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/build-pipeline/snapshot` | GET | Snapshot del pipeline |
| `/api/build-pipeline/dry-run` | POST | Ejecutar dry-run |
| `/api/build-pipeline/request-approval` | POST | Solicitar aprobación |

## Variables de entorno

Ver `.env.example` — todas las flags de ejecución real en `false` por defecto.
