# Future Integrations

## Fase 2 — Adapter runtime

| Pilar | Integración |
|-------|-------------|
| Strategy | `getDiscoveryAnswers` vía adapter (client-only guard) |
| Product | Delegar `generateProductPRD` tras validación server |
| Build | Conectar `generateBuildPlan` en build-plan adapter |
| Studio | `buildPortfolioDashboardData` read-only |
| Intelligence | `syncVentureMemory` desde intelligence-layer |

## Fase 3 — Connectors

Implementar `BuildConnector.connect()` para:

1. Cursor — export de prompts
2. GitHub — repo scaffold
3. Vercel — deploy hook

## Fase 4 — CEO bridge

Conectar `ceo-office.adapter` sin importar FOS en engine — patrón inyección.

## Fase 5 — Event bus unificado

Evaluar merge con `lib/fos/event-bus` mediante adapter, no refactor directo.

## APIs externas

Nuevas APIs (Stripe, analytics, CRM) entran solo como connectors o growth adapters — nunca como dependencia directa entre pilares.

## Criterios de ready

Un pilar pasa a `status: 'ready'` cuando:

1. Todos sus adaptadores tienen al menos una operación runtime probada
2. `healthCheck()` valida dependencias
3. Tests de contrato (futuro) pasan
