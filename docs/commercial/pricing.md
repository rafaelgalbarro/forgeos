# Planes y precios — Program 6000

## Planes

| Plan | Precio/mes | Precio/año | Asientos |
|------|------------|------------|----------|
| **Starter** | €0 | €0 | 1 |
| **Pro** | €49 | €470 | 5 |
| **Business** | €149 | €1.430 | 25 |
| **Enterprise** | €499 | €4.790 | Ilimitados |

## Feature matrix

Ver matriz completa en `/pricing` o `lib/commercial/plans.ts` → `FEATURE_MATRIX`.

## Trial

14 días en plan Pro por defecto. Gestionar en `/subscriptions`.

## Cupones demo

- `FORGE-LAUNCH-20` — 20% en Pro/Business
- `FOUNDER-VIP` — 50% en Pro

## API

```typescript
import { listPlans, quotePlan, comparePlans } from "@/lib/commercial";
```
