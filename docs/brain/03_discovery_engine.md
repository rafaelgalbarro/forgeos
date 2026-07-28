# 03 — Discovery Engine

## Rol

Transformar una idea ambigua en **decisiones explícitas** mediante preguntas priorizadas y un loop de respuestas.

## Ubicación en código

```
lib/discovery/
  discovery-engine.ts      → runDiscovery / previewDiscovery
  idea-classifier.ts       → productType, marketType, businessModel
  decision-detector.ts     → missingDecisions, risks
  question-generator.ts    → hasta 5 preguntas en preview
  discovery-context.ts     → buildDiscoveryContext()
  discovery-answers-store.ts → localStorage por projectId/draftId
```

## Tipos de pregunta

| Tipo | UI |
|------|-----|
| `single_choice` | Botones exclusivos |
| `multiple_choice` | Multi-selección |
| `free_text` | Input corto |

## Flujo Answers Loop (Sprint 13+)

1. Usuario escribe idea en Studio Home
2. `previewDiscovery()` genera hasta 5 preguntas
3. Respuestas → `DiscoveryAnswerMap` en localStorage
4. `buildDiscoveryContext()` produce hints estructurados
5. Contexto alimenta Intelligence, Research, Product y Simulator

## DiscoveryContext — campos clave

- `clarifiedDecisions` — resumen legible
- `inferredProductType` / `inferredBusinessModel`
- `monetizationHints`, `platformHints`, `buildConstraints`
- `remainingQuestions` — sin responder aún
- `answers[]` — trazabilidad completa

## Prioridad sobre heurísticas

Si el usuario responde "tipo Wallapop" → C2C/Marketplace  
Si responde "comisión" → monetización por transacción  
Si responde "vertical" → wedge, menor competencia percibida  
Si responde "pagos en plataforma" → mayor complejidad técnica  

Implementado en `discovery-context.ts` y `discovery-intelligence.ts`.

## Discovery Score

Mide **claridad de definición** (no viabilidad de mercado). Complementa Startup Score.

## Persistencia

- Draft en home: `forgeos_discovery_draft_id`
- Respuestas: `forgeos_discovery_answers`
- Migración al crear venture: `migrateDiscoveryAnswers(draftId, ventureId)`

## Límites v0.1

- Inferencia por patrones de texto, no NLP
- Sin re-edición de respuestas en Venture Workspace
- Máximo 5 preguntas en preview UI

## Relación con Brain

Discovery es la **capa de preguntas** del cerebro. Sin respuestas, el resto del sistema funciona en modo degradado pero honesto.
