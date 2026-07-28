# 09 — Venture Studio Flow

## Definición

El **Venture Studio Flow** es el recorrido end-to-end que un fundador sigue dentro de ForgeOS, desde la primera idea hasta el handoff de construcción (y más allá en versiones futuras).

## Flujo completo (objetivo v5.0)

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────────┐
│  STUDIO  │───▶│ INTELLIGENCE│───▶│ BUILD FLOW   │───▶│  VENTURE   │
│  (idea)  │    │ (validate)  │    │  (workers)   │    │ WORKSPACE  │
└──────────┘    └─────────────┘    └──────────────┘    └────────────┘
                      │                                        │
                      ▼                                        ▼
               ┌─────────────┐                          ┌────────────┐
               │  DISCOVERY  │                          │ BUILD PLAN │
               │  (preguntas)│                          │  EXPORT    │
               └─────────────┘                          └────────────┘
```

## Fases detalladas

### Fase 1 — Captura (Studio)

| Paso | Acción | Salida |
|------|--------|--------|
| 1.1 | Usuario describe idea | `ideaText` |
| 1.2 | Análisis heurístico | tags, categoría, mercado preliminar |
| 1.3 | Founder Advisor | stance, riesgos, alternativas |
| 1.4 | Navegación a Intelligence | `ventureId` |

**Ruta:** `/` → `/intelligence/[id]`

### Fase 2 — Validación (Intelligence)

| Paso | Acción | Salida |
|------|--------|--------|
| 2.1 | Discovery Panel | preguntas + respuestas |
| 2.2 | Intelligence Report | análisis estructurado |
| 2.3 | Venture Simulator | scores, escenarios, recomendación |
| 2.4 | Decisión usuario | aceptar / continuar de todos modos |

**Punto de no-retorno:** "Aceptar y construir startup"

### Fase 3 — Construcción de artefactos (Build Flow)

| Paso | Worker | Salida |
|------|--------|--------|
| 3.1 | Research | researchReport |
| 3.2 | Product | productPRD |
| 3.3 | (futuro) Design, Architecture | mockups, diagramas |
| 3.4 | Orchestrator | secciones venture |

**Ruta:** `/build/[id]` → thinking mode → workers

### Fase 4 — Operación (Venture Workspace)

| Sección | Contenido |
|---------|-----------|
| Overview | Resumen, advisor, simulator |
| Product | PRD, roadmap |
| Engineering | Build Plan |
| Export | MD, PDF, ZIP |

**Ruta:** `/venture/[id]`

### Fase 5 — Handoff (Build Plan)

| Entrega | Consumidor |
|---------|------------|
| Stack + módulos | Equipo técnico |
| APIs + pantallas | Desarrollo |
| Prompt Cursor / Claude | IDE |
| Checklist MVP | PM |

### Fases futuras (v6+)

| Fase | Módulo |
|------|--------|
| Launch | Forge Launch |
| Growth | Forge Growth |
| Finance | Forge Finance |
| Fundraise | Investor Pack + data room |

## Roles en el flujo

| Rol | Intervención |
|-----|--------------|
| Fundador | Input, decisiones, override |
| Forge Brain | Reglas y contexto |
| Workers | Generación especializada |
| AI CEO (v2) | Priorización y gates |
| AI Board (v3) | Deliberación en gates mayores |

## Tiempos orientativos (hipótesis)

| Fase | Duración típica sesión |
|------|------------------------|
| Studio → Intelligence | 10–30 min |
| Discovery completo | +15–45 min |
| Build Flow (workers) | 2–10 min (automático) |
| Revisión Workspace | 30–90 min |
| Handoff a código | Días–semanas (externo) |

## Flujo de datos persistente

```
localStorage (v0.1)
├── ventures[]
├── discoveryContext per venture
├── ventureSimulatorResult
├── sections[]
└── dna per projectId
```

## Anti-flujos (qué evitar)

| Anti-flujo | Por qué es malo |
|------------|-----------------|
| Idea → código directo | Sin validación |
| Build sin Intelligence | Sin consentimiento informado |
| Ignorar Simulator | Dispersión de esfuerzo |
| Múltiples ventures activos sin CEO | Burnout del fundador |

## Implementación v0.1

Flujo Studio → Intelligence → Build → Venture Workspace **completo**.

Faltan: Launch, Growth, CEO automation, timeline UI.
