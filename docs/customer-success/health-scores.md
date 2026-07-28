# Health Scores — Customer Success Platform

## Puntuación de salud del cliente

`lib/customer-success/customer-health.ts` delega en `lib/design-partners/customer-health.ts`.

Storage key: `forgeos-dp-customer-health`

## Factores

| Factor | Peso | Fuente |
|--------|------|--------|
| Activación | 30% | Etapas completadas en journey |
| Retención | 30% | Llegada a etapa `analytics` |
| Engagement | 25% | Eventos DP del usuario |
| Feedback | 15% | Entradas en inbox de feedback |

## Tiers

| Score | Tier | Etiqueta ES |
|-------|------|-------------|
| ≥ 80 | champion | Campeón |
| ≥ 60 | healthy | Saludable |
| ≥ 40 | neutral | Neutral |
| < 40 | at-risk | En riesgo |

## Puntuación de éxito compuesta

`success-score.ts` combina salud, NPS, retención, activación, expansión y engagement:

```ts
import { computeSuccessScore, computeCustomerHealth } from "@/lib/customer-success";

const health = computeCustomerHealth();
const score = computeSuccessScore(health); // 0-100
```

## Snapshot completo

```ts
import { getCustomerSuccessSnapshot } from "@/lib/customer-success";

const snap = getCustomerSuccessSnapshot();
// snap.health, snap.successScore, snap.nps, snap.retention, ...
```
