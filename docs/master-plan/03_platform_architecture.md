# 03 — Arquitectura de plataforma

## Visión arquitectónica

ForgeOS se organiza en **cuatro capas** que se comunican a través del objeto `Venture`:

```
┌─────────────────────────────────────────────────────────┐
│                    EXPERIENCE LAYER                      │
│  Studio · Intelligence · Venture Workspace · Portfolio   │
├─────────────────────────────────────────────────────────┤
│                    GOVERNANCE LAYER                      │
│  AI CEO · AI Board · Decision System · Timeline          │
├─────────────────────────────────────────────────────────┤
│                    EXECUTION LAYER                       │
│  Workers · Orchestrator · Build Plan · Export          │
├─────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                      │
│  Forge Brain · Knowledge Engine · Forge DNA · Storage  │
└─────────────────────────────────────────────────────────┘
```

## Objeto central: Venture

Todo artefacto cuelga de un **Venture** (startup en gestación o activa):

| Dimensión | Contenido |
|-----------|-----------|
| Identidad | id, name, ideaText, category |
| Contexto | discoveryContext, intelligenceReport |
| Análisis | researchReport, ventureSimulatorResult |
| Producto | productPRD, sections[] |
| Técnico | buildPlan (generado), DNA |
| Meta | timestamps, sources (ai/mock) |

## Flujo de datos (v0.1 implementado)

```
Usuario (idea)
    → Studio / Intelligence
    → Discovery Engine
    → Venture Simulator + Founder Advisor
    → [Decisión usuario] Build Workflow
    → Workers: Research → Product → …
    → Venture Workspace + Forge DNA
    → Export (MD / PDF / ZIP) + Build Plan prompts
```

## Capas detalladas

### Experience Layer

| Superficie | Rol |
|------------|-----|
| Studio (`/`) | Entrada conversacional, análisis inicial |
| Intelligence (`/intelligence/[id]`) | Pre-build: reporte + decisión |
| Venture Workspace (`/venture/[id]`) | Documentos, simulator, build plan |
| Portfolio (`/projects`) | Lista de ventures |
| Dashboard (`/dashboard`) | Vista agregada (evolución futura) |

### Governance Layer (roadmap)

| Componente | Rol |
|------------|-----|
| AI CEO | Prioriza portfolio, bloquea decisiones débiles |
| AI Board | Perspectivas CEO/CTO/CFO/… |
| Decision System | Build / MVP / Research / Pivot / Wait |
| Startup Timeline | Estado en ciclo de vida |

### Execution Layer

| Componente | Rol |
|------------|-----|
| Worker Registry | Catálogo de workers especializados |
| Orchestrator | Secuencia y dependencias |
| Build Plan Generator | Handoff técnico heurístico + prompts |
| Export Pipeline | MD, PDF, ZIP |

### Foundation Layer

| Componente | Rol |
|------------|-----|
| Forge Brain | Contexto y reglas para workers |
| Knowledge Engine | Catálogo orientativo (no verdad absoluta) |
| Forge DNA | Memoria operativa por projectId |
| Storage | localStorage (v0.1) → Supabase/cloud (futuro) |

## Integración con IA

| Modo | Uso v0.1 | Uso futuro |
|------|----------|------------|
| Heurístico | Intelligence, Simulator, Build Plan | Fallback siempre disponible |
| IA selectiva | Research, Product (API Anthropic) | Más workers con routing |
| Agentes autónomos | No | v10 bajo supervisión |

**Principio:** la IA nunca es el único camino; el flujo debe completarse sin API key.

## Integración externa

| Sistema | Dirección | Propósito |
|---------|-----------|-----------|
| Cursor / Claude | Export → prompt | Construcción |
| GitHub | Futuro | Repos por venture |
| Stripe | Futuro | Pagos del venture + billing ForgeOS |
| Supabase | Futuro (no tocar en sprints actuales) | Persistencia cloud |

## Principios arquitectónicos

1. **Venture-centric** — no hay estado global opaco
2. **Contratos explícitos** — tipos TypeScript por módulo (`lib/`)
3. **Replaceable AI** — mock y real comparten interfaz
4. **Progressive disclosure** — UI simple al inicio, profundidad en workspace
5. **Export as API** — si se puede exportar, es un contrato estable

## Estado actual vs objetivo

| Capa | v0.1 | v5.0 objetivo |
|------|------|---------------|
| Experience | Studio + Workspace | + Portfolio avanzado |
| Governance | Simulator + heurísticas | AI CEO + Board |
| Execution | Workers + Build Plan | Build Engine integrado |
| Foundation | Brain + DNA local | Cloud + Knowledge vivo |

## Referencias de código

- `lib/domain/venture.ts` — modelo venture
- `lib/workers/` — orquestación
- `lib/brain/` — contexto workers
- `lib/build-plan/` — handoff técnico
- `lib/export/` — pipeline exportación
