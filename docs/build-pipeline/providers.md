# Proveedores — Build Pipeline

El pipeline Sprint 5 integra tres proveedores principales vía adapters que envuelven `lib/real-build-flow/` y `lib/connections/`.

## GitHub

| Campo | Valor |
|-------|-------|
| Adapter | `lib/build-pipeline/github-step.ts` |
| Underlying | `lib/real-build-flow/github-step.ts` |
| Connection | `lib/connections/github/adapter.ts` |
| Env | `GITHUB_TOKEN`, `ENABLE_REAL_GITHUB_EXECUTION` |

### Operaciones

- `create_repository` — repo privado propuesto/creado
- `create_branch` — rama `forgeos/init`
- `prepare_scaffold` — estructura base del proyecto

## Supabase

| Campo | Valor |
|-------|-------|
| Adapter | `lib/build-pipeline/supabase-step.ts` |
| Underlying | `lib/real-build-flow/supabase-step.ts` |
| Connection | `lib/connections/supabase/adapter.ts` |
| Env | `SUPABASE_ACCESS_TOKEN`, `ENABLE_REAL_SUPABASE_EXECUTION` |

### Operaciones

- `create_database` — proyecto sandbox
- Migraciones: `001_init.sql`, `002_rls.sql`, `003_seed.sql`

## Vercel

| Campo | Valor |
|-------|-------|
| Adapter | `lib/build-pipeline/vercel-step.ts` |
| Underlying | `lib/real-build-flow/vercel-step.ts` |
| Connection | `lib/connections/vercel/adapter.ts` |
| Env | `VERCEL_TOKEN`, `ENABLE_REAL_VERCEL_EXECUTION` |

### Operaciones

- `deploy_software` — solo target `preview`
- `production: false` siempre

## Salud de conexiones

El dashboard muestra el estado de cada proveedor:

- **Configurado** — credencial presente en env servidor
- **Sin credencial** — dry-run sigue funcionando
- **Real habilitado** — flag per-provider + `ENABLE_REAL_EXECUTION`

Verificación live: `GET /api/connections/test` (RC5).

## Política preview-only

| Operación | Permitida |
|-----------|-----------|
| Preview deploy | Sí (con aprobación) |
| Sandbox DB | Sí (con aprobación) |
| Private repo create | Sí (con aprobación) |
| Production deploy | **No** |
| DNS apply | **No** |
| Delete repo | **No** |
| Push to main | **No** |
