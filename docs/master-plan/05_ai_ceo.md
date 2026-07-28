# 05 — AI CEO

## Definición

El **AI CEO** es el agente ejecutivo de ForgeOS: prioriza, decide, coordina workers, solicita información faltante, bloquea decisiones débiles y recomienda pivots.

No sustituye al fundador humano — actúa como **CEO copiloto** con memoria y método.

## Estado

| Campo | Valor |
|-------|-------|
| Implementación | **Roadmap v2.0** — no implementado en v0.1 |
| Base actual | Venture Simulator + Founder Advisor + Decision System |

## Responsabilidades

### 1. Priorizar

- Ordenar ventures en portfolio por urgencia, score y recursos
- Asignar siguiente acción por venture (research, build, pause)
- Evitar paralelismo excesivo del fundador

### 2. Decidir

Emitir recomendaciones alineadas con el Decision System:

| Decisión | Cuándo (CEO aplica Brain + contexto) |
|----------|-------------------------------------|
| **Build** | Score alto, contexto rico, stance proceed |
| **Build small MVP** | Viable con alcance reducido |
| **Research more** | Incertidumbre alta, gaps de Discovery |
| **Pivot** | Challenge stance + señales negativas |
| **Do not build yet** | Score crítico, riesgos sin mitigar |

### 3. Coordinar workers

- Seleccionar qué worker ejecutar y en qué orden
- Pasar contexto Brain + DNA a cada worker
- Evitar workers redundantes (ej. Product sin Research)

### 4. Pedir información

- Generar preguntas Discovery dirigidas
- Solicitar validación explícita antes de gates críticos
- Escalar al fundador cuando falte juicio humano (legal, ética, partnerships)

### 5. Bloquear decisiones débiles

**"Bloquear" en ForgeOS = fricción informada**, no hard lock:

| Mecanismo | Comportamiento |
|-----------|----------------|
| Warning banner | Recomendación en rojo con razones |
| Confirmación extra | "Entiendo los riesgos" antes de build |
| Cooldown | Sugerir 24h si pivot reciente |
| Gate documental | Exigir Research antes de Build Plan |

El fundador siempre puede override — queda en Decision Log.

### 6. Recomendar pivots

Señales de pivot:

- Venture Score < 42 con stance challenge
- Competencia alta sin wedge
- Unit economics simulados inviables
- Discovery contradice supuestos del PRD

Formato de recomendación:

```
Pivot sugerido: [dirección]
Razón: [2–3 bullets]
Alternativa conservadora: [build small MVP / research]
```

## Interfaz (visión)

| Superficie | Contenido |
|------------|-----------|
| CEO Brief | Resumen diario del portfolio |
| Venture directive | Siguiente acción por venture |
| Challenge mode | Preguntas difíciles antes de build |
| Decision history | Log de recomendaciones vs acciones usuario |

## Inputs del CEO

- Forge Brain (principios + decision rules)
- Venture Simulator scores
- Discovery completeness
- Forge DNA (historial)
- Timeline stage
- Recursos del workspace (plan, límites)

## Outputs del CEO

- `CEORecommendation` — decisión + confianza + razones
- `WorkerPlan` — cola de workers
- `InformationRequest[]` — preguntas al fundador
- `PortfolioPriority[]` — ranking ventures

## Límites explícitos

El AI CEO **no debe**:

- Firmar contratos ni compromisos legales
- Mover dinero real
- Desplegar a producción sin confirmación
- Inventar métricas de mercado
- Garantizar ROI

## Relación con AI Board

- CEO **propone** y **ejecuta** agenda diaria
- Board **desafía** en gates mayores (pre-build, pre-launch, fundraising)
- CEO sintetiza opiniones del Board en una recomendación final

## Roadmap de implementación

| Sprint lógico | Entrega |
|---------------|---------|
| v2.0-alpha | CEO Brief heurístico en Dashboard |
| v2.0-beta | WorkerPlan automático |
| v2.0 | Challenge gates + Decision Log integrado |
