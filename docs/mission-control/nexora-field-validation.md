# NEXORA FIELD — Mission Control E2E Validation Case

## Reference Input

```
Quiero crear una plataforma para gestionar técnicos, incidencias, rutas, inventario y facturación en empresas de mantenimiento.
```

## Expected Classification

| Field | Value |
|-------|-------|
| Primary | VENTURE |
| Secondary | APPLICATION |
| Confidence | ≥ 70% |

## CEO Explanation (expected)

1. **Venture first** — business model, ICP, unit economics before product scale
2. **Web app** — core operational platform for technicians, incidents, routes, inventory
3. **Public website** — recommended for B2B acquisition, not MVP blocker
4. **Mobile** — field technicians benefit; evaluate in BUILD; MVP can start with PWA

## Clarifying Question

One question if ambiguous. For NEXORA input, first understanding question:

> ¿Quién es tu cliente objetivo principal?

## Venture Fixture

- **ID**: `demo-venture-nexora-field`
- **Slug**: `nexora-field`
- **File**: `lib/fixtures/nexora-field-venture.ts`
- **Registry**: `lib/venture-e2e/fixture-registry.ts`

Generic fixture — no hardcoded NEXORA logic in pipeline.

## Understanding Topics (spread across conversation)

1. Target client — maintenance companies, facility SMB
2. Region — Spain first
3. Revenue model — per technician/month subscription
4. User profile — managers + field technicians
5. Critical problem — fragmented WhatsApp/Excel operations
6. Priority integration — billing/ERP
7. MVP goal — incidents + technicians + routes in 8 weeks

## Stage Evidence

| Phase | Expected Artifact |
|-------|-------------------|
| UNDERSTAND | CEO classification + rationale |
| PLAN | 22-stage mission plan |
| BUILD | Website + App + Mobile readiness previews |
| VALIDATE | 8-dimension scores (heuristic) |
| DEPLOY | GitHub/Supabase/Vercel preview plan |
| OPERATE | KPIs, roadmap, backlog preview |
| EVOLVE | Self-evolution recs, CEO weekly review |

## Programmatic Validation

```bash
node scripts/validate-mission-e2e.js
```

Or via server action:

```ts
const intent = await classifyMissionIntentAction(NEXORA_FIELD_IDEA);
// intent.primary === "VENTURE"
// intent.secondary includes "APPLICATION"
```

## Routes

- Mission: `/missions/[missionId]` (after session created)
- Venture: `/ventures/nexora-field`

## Disclaimer

All scores and previews are **demo/heuristic**. No production deploy, DNS, or external ops.
