# Scalability

## Aislamiento por pilar

Cada pilar puede escalar independientemente:

- **Strategy/Product** — CPU-bound (AI calls) → colas futuras
- **Build** — I/O connectors → workers separados
- **Intelligence** — storage local → migración a DB
- **Studio** — read-heavy portfolio → cache

## Registry pattern

`registerPillar` permite registrar implementaciones alternativas sin cambiar consumidores — útil para multi-tenant o white-label.

## Event bus

El stub in-memory no escala; en producción:

1. Adapter hacia `lib/fos/event-bus`
2. O message queue externa (SQS, Pub/Sub) vía connector

## Bundle size

`lib/platform/index.ts` importa solo registries — no engines pesados. Los consumidores pueden importar pilares individuales:

```ts
import { strategyPillarEngine } from '@/lib/platform/strategy';
```

## SSR / Edge

Adaptadores type-only minimizan código en server bundle. Runtime adapters deben declarar `typeof window` guards.

## Multi-venture

`VentureId` en cada operación — diseño stateless listo para portfolio de N ventures.

## Límites v1.0

- Sin persistencia platform-native
- Sin cache layer
- Sin horizontal scaling — scaffold only
