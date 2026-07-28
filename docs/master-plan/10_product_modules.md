# 10 — Módulos de producto

## Catálogo de módulos ForgeOS

Cada módulo es una capacidad de plataforma con dominio, UI y contratos propios.

| Módulo | Código | Fase | Estado v0.1 |
|--------|--------|------|-------------|
| Forge Brain | `forge-brain` | Foundation | Parcial (`lib/brain/`) |
| Forge Discovery | `forge-discovery` | Explore | Implementado |
| Forge Intelligence | `forge-intelligence` | Explore | Implementado |
| Forge Research | `forge-research` | Explore | Implementado (IA) |
| Forge Venture | `forge-venture` | Operate | Implementado (workspace) |
| Forge Product | `forge-product` | Design | Implementado (IA) |
| Forge Design | `forge-design` | Design | Roadmap |
| Forge Architecture | `forge-architecture` | Design | Roadmap |
| Forge Build | `forge-build` | Build | Parcial (Build Plan) |
| Forge Launch | `forge-launch` | Launch | Roadmap |
| Forge Growth | `forge-growth` | Scale | Roadmap |
| Forge Finance | `forge-finance` | Scale | Roadmap |
| Forge Legal | `forge-legal` | Launch | Roadmap |
| Forge Analytics | `forge-analytics` | Scale | Roadmap |
| Forge Marketplace | `forge-marketplace` | Ecosystem | Roadmap |
| Forge Cloud | `forge-cloud` | Infrastructure | Roadmap |
| Forge DNA | `forge-dna` | Foundation | Parcial (`lib/dna/`) |

---

## Módulos detallados

### Forge Brain
Cerebro central — principios, decisiones, contexto. Ver [04_forge_brain.md](./04_forge_brain.md).

### Forge Discovery
Motor de preguntas para reducir ambigüedad. Genera `discoveryContext` persistido.

| Input | Output |
|-------|--------|
| ideaText, intelligence | preguntas, respuestas, hints |

### Forge Intelligence
Análisis pre-build: tags, mercado, competencia preliminar, Founder Advisor.

| Input | Output |
|-------|--------|
| ideaText | intelligenceReport, scores preliminares |

### Forge Research
Informe de mercado, competidores, oportunidades. IA con fallback mock.

| Input | Output |
|-------|--------|
| idea + discovery + brain | researchReport |

### Forge Venture
Venture Workspace — documentos, navegación, exports, simulator, build plan.

| Input | Output |
|-------|--------|
| venture completo | UI + exports |

### Forge Product
PRD estructurado: problema, MVP, user stories, métricas.

| Input | Output |
|-------|--------|
| idea + research + discovery | productPRD |

### Forge Design
Wireframes, UI kit, design system del venture. **Roadmap v5+**.

### Forge Architecture
Diagramas C4, ADRs, decisiones técnicas. Complementa Build Plan.

### Forge Build
Build Plan, prompts IDE, checklist MVP. Build Engine (código) en v5.

| v0.1 | v5.0 |
|------|------|
| Heurístico + export | Generación + sync repo |

### Forge Launch
Checklist go-to-market, landing, legal mínimo, deploy.

### Forge Growth
Experimentos, loops, canales, métricas de crecimiento.

### Forge Finance
Runway, pricing, unit economics, integración contable.

### Forge Legal
Términos, privacidad, estructura societaria — siempre con disclaimer humano.

### Forge Analytics
Dashboard métricas venture + portfolio. Integraciones externas.

### Forge Marketplace
Templates, workers premium, ventures públicos. Ver [13_marketplace_strategy.md](./13_marketplace_strategy.md).

### Forge Cloud
Deploy, hosting, env management del venture. **No Supabase en sprints actuales.**

### Forge DNA
Memoria operativa por venture. Ver [12_forge_dna.md](./12_forge_dna.md).

---

## Dependencias entre módulos

```
Discovery ──▶ Intelligence ──▶ Research ──▶ Product
                    │                         │
                    ▼                         ▼
              Venture Simulator          Build Plan
                    │                         │
                    └────────▶ Venture Workspace ◀──┘
                                    │
                                    ▼
                              Forge DNA
```

## Principio de modularidad

Cada módulo debe:

1. Exponer tipos en `lib/{modulo}/`
2. Ser invocable como worker o panel UI
3. Funcionar con fallback sin IA
4. Contribuir a Export y/o DNA

## Priorización de desarrollo

| Prioridad | Módulos |
|-----------|---------|
| P0 (hecho) | Discovery, Intelligence, Research, Product, Venture, Build Plan |
| P1 (v2–v4) | CEO, Board, Portfolio, Timeline UI |
| P2 (v5–v7) | Design, Architecture, Build Engine, Launch, Growth |
| P3 (v8–v10) | Marketplace, Cloud, Enterprise, Autonomy |
