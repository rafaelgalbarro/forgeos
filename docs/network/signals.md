# Señales de mercado — ForgeOS Network

Motor de señales agregadas del ecosistema ForgeOS.

## Archivo

`lib/network/signal-engine.ts`

## Tipos de señal

| Campo | Valores |
|-------|---------|
| `strength` | strong, moderate, weak |
| `direction` | up, down, stable |
| `confidence` | 0–1 |

## Señales demo (SaaS)

1. **Aceleración SaaS B2B en España** — crecimiento 21%, fuerza strong
2. **Presión competitiva en pricing** — 34% ajustando precios al alza
3. **Churn elevado en tier entry** — planes < 40 €/mes
4. **Adopción de IA en producto** — 58% integran IA en roadmap

## Uso

```typescript
import { buildMarketSignals } from "@/lib/network";

const signals = buildMarketSignals({ sector: "saas", ... });
const strongest = getStrongestSignal(signals);
```

Todas las señales incluyen `disclaimer: "Simulación con datos demo"`.
