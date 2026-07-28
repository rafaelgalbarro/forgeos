# Pilar Build

## Responsabilidad

Plan de construcción técnica y conectores a herramientas de desarrollo.

## Módulos

- Build Plan — checklist, prompts Cursor/Claude, export markdown
- Connectors — interfaces para IDE, AI, VCS, DB, infra
- Orchestration — coordinación futura con build-engine

## Adaptadores

| Adaptador | Lib existente |
|-----------|---------------|
| `build-plan.adapter.ts` | `@/lib/build-plan` |

## Conectores (solo interfaces)

Cursor, Claude, GitHub, Copilot, Replit, Supabase, Docker, Vercel, Cloudflare.

Sin implementación en v1.0 — registry stub con `connect()` que devuelve `ok: false`.

## Estado

`scaffold`
