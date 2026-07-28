# Programa 5 — Venture Ecosystem

**ID:** `venture-ecosystem`  
**Estado:** `scaffold`  
**Versión programa:** 2030.0.0

## Objetivo

Capital, marketplace y conexión con el ecosistema externo de ventures.

## Pilares vinculados

- Capital (`lib/platform/capital`)

## Módulos existentes

| Módulo | Path | Estado |
|--------|------|--------|
| Capital Pillar | `lib/platform/capital` | scaffold |
| Marketplace | `lib/marketplace` | futuro (no existe en lib/) |

## Scaffold types

En `lib/programs/venture-ecosystem/types.ts`:

- `MarketplaceListing` — listings de templates/servicios/ventures
- `CapitalRaiseRound` — rondas de fundraising

## Capabilities

- capital, marketplace (ambos scaffold)

## Epic registry

Vacío (scaffold).

## Roadmap relacionado

- Platform v3.0 — Capital + Marketplace
- `docs/master-plan/13_marketplace_strategy.md`

## Código

```
lib/programs/venture-ecosystem/
├── index.ts
├── types.ts
├── program.ts
├── registry.ts
├── modules.ts
└── README.md
```
