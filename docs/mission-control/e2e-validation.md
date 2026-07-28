# PROGRAM 5150 — Mission Control E2E Validation

## Objective

Validate Mission Control end-to-end with a new company reference case (NEXORA FIELD). Demonstrate official flow:

**MISSION → UNDERSTAND → PLAN → BUILD → VALIDATE → DEPLOY → OPERATE → EVOLVE**

## Constraints

- No new engines, no duplicate logic, no parallel MC experience
- No productive actions (no real deploy, DNS, production)
- NEXORA FIELD is validation-only — pipeline works for any mission
- No Runtime/AI Runtime internals modified (adapters only)
- First render: snapshots only; engines via server actions / dynamic import

## Architecture

| Layer | Files |
|-------|-------|
| Types | `lib/mission-control/types.ts` |
| Session | `lib/mission-control/mission-session.ts` |
| Runner | `lib/mission-control/mission-runner.ts` |
| Validator | `lib/mission-control/mission-validator.ts` |
| History | `lib/mission-control/mission-history.ts` |
| Repository | `lib/mission-control/mission-repository.ts` |
| Plan | `lib/mission-control/mission-plan.ts` |
| Adapters | `lib/mission-control/adapters/*` |
| Server actions | `app/actions/mission-control.ts` |

## Routes

| Route | Purpose |
|-------|---------|
| `/mission-control` | Main MC entry (snapshots SSR) |
| `/mission-control/[missionId]` | Legacy persisted mission |
| `/missions/[missionId]` | Canonical mission route (5150) |
| `/ventures/nexora-field` | NEXORA FIELD venture fixture |

## Validation Flow (NEXORA FIELD)

1. Open `/mission-control`
2. Enter: *"Quiero crear una plataforma para gestionar técnicos, incidencias, rutas, inventario y facturación en empresas de mantenimiento."*
3. CEO classifies **VENTURE + APPLICATION** and explains venture-first, web app, website, mobile timing
4. Answer understanding questions (one per message): target client, region, revenue, user profile, critical problem, integration, MVP goal
5. Auto-advance through PLAN → BUILD → VALIDATE → DEPLOY → OPERATE → EVOLVE (preview only)
6. Reload page — mission persists at `/missions/[missionId]`
7. Open venture at `/ventures/nexora-field`

## Server Actions (on-demand)

```ts
import { classifyMissionIntentAction, runMissionValidationAction } from "@/app/actions/mission-control";
```

## Build Verification

```bash
npm run kill:ports
npm run clean
npm run build
npm run reset:dev
```

Routes to verify HTTP 200:

- `/`, `/mission-control`, `/missions/[missionId]`, `/ventures/nexora-field`
- `/command-center`, `/website-factory`, `/application-factory`, `/mobile-factory`

## Evidence Checklist

- [ ] Intention: VENTURE + APPLICATION
- [ ] CEO rationale displayed
- [ ] Mission plan with 22 stages
- [ ] Build previews (website, app, mobile readiness)
- [ ] Validation scores (8 dimensions)
- [ ] Deploy preview (no production)
- [ ] Operate/Evolve previews
- [ ] Persistence after reload
- [ ] Build exit 0
