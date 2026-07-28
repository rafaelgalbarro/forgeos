# Mapeo Pilar ↔ Programa

Fuente de verdad: `lib/programs/mapping.ts`

## Programa → Pilares

| Programa | Pilares |
|----------|---------|
| venture-core | strategy, product, studio |
| venture-execution | build |
| venture-intelligence | intelligence, ceo |
| venture-platform | studio, launch, growth |
| venture-ecosystem | capital |

## Pilar → Programa(s)

| Pilar | Programa(s) |
|-------|-------------|
| strategy | venture-core |
| product | venture-core |
| build | venture-execution |
| launch | venture-platform |
| growth | venture-platform |
| ceo | venture-intelligence |
| studio | venture-core, venture-platform |
| intelligence | venture-intelligence |
| capital | venture-ecosystem |

> **Nota:** `studio` aparece en venture-core y venture-platform — venture-core cubre operaciones de estudio existentes; venture-platform cubre scaffold SaaS futuro.

## Módulo → Programa

| Módulo (path) | Programa |
|---------------|----------|
| lib/discovery | venture-core |
| lib/portfolio | venture-core |
| lib/intelligence | venture-core |
| lib/venture-simulator | venture-core |
| lib/build-plan | venture-core (+ referencia en venture-execution) |
| lib/export | venture-core |
| lib/design-system | venture-core |
| lib/knowledge | venture-core |
| lib/build-engine | venture-execution |
| lib/platform/build/connectors | venture-execution |
| lib/intelligence-layer | venture-intelligence |
| lib/ceo | venture-intelligence |
| lib/board | venture-intelligence |
| lib/fos | venture-intelligence |
| lib/platform/launch | venture-platform |
| lib/platform/growth | venture-platform |
| lib/notifications | venture-platform |
| lib/headquarters | venture-platform |
| lib/platform/capital | venture-ecosystem |
| lib/marketplace | venture-ecosystem (futuro) |

## API de resolución

```typescript
import {
  programToPillars,
  pillarToProgram,
  getPillarsForProgram,
  resolveModuleProgram,
} from "@/lib/programs";
```
