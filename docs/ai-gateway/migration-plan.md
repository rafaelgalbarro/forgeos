# Migration Plan

## Fase 1 (actual)

- [x] AI Gateway core
- [x] `/api/ai/run`
- [x] Research via gateway
- [x] Product via gateway

## Fase 2

- [ ] CEO Engine → task `ceo`
- [ ] Board → task `board`
- [ ] Build Plan → task `build-plan`

## Fase 3

- [ ] Legal, Marketing, Code workers
- [ ] Forge Intelligence insights (opcional IA)
- [ ] Forge Capital document generation

## Cómo migrar un módulo

1. Identificar tarea en `AITask`
2. Reemplazar `fetch` directo por `completeAITask({ task, system, user })`
3. Mantener mock fallback del módulo
4. Verificar `npm run build`
5. Documentar en este archivo
