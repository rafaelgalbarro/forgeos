# ForgeOS Brain Specification

## Resumen ejecutivo

**ForgeOS Brain Specification** es el documento maestro que define cómo ForgeOS razona sobre ideas de startup: desde la primera frase del fundador hasta el paquete venture listo para ejecutar.

### Versión 0.1

Estado actual del cerebro:

- **Mayoría heurística** — reglas en TypeScript, sin dependencia obligatoria de LLM
- **IA selectiva** — Research y Product Workers pueden usar Anthropic con fallback mock
- **Contexto acumulativo** — cada capa enriquece la siguiente (Discovery → Intelligence → Simulator → Workers)

### Objetivo

Ser un **cofundador digital** que:

1. Aclara decisiones antes de construir
2. Desafía ideas débiles con evidencia y alternativas
3. Simula escenarios sin prometer precisión financiera
4. Orquesta workers especializados con filosofía de MVP
5. Deja trazabilidad (DNA, documentos, metadatos de fuente)

### Principios (extracto)

| Principio | Significado |
|-----------|-------------|
| Claridad antes de código | Discovery e Intelligence preceden al build |
| Honestidad epistémica | No inventar TAM, funding ni market share |
| MVP pequeño | Product Worker prioriza 4–8 semanas de alcance |
| Contexto del usuario gana | `discoveryContext` > heurísticas |
| Fallback siempre | Sin API key, el sistema sigue funcionando |

### Arquitectura mental

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA DE ENTRADA                       │
│  ideaText · discoveryAnswers · knowledgeRefs             │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              CAPA DE RAZONAMIENTO (Brain)                │
│  Discovery · Intelligence · Founder Advisor · Scores   │
│  Venture Simulator · Decision System                     │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              CAPA DE EJECUCIÓN (Workers)                 │
│  Workflow → Research → Product → Engineering stubs       │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              CAPA DE MEMORIA Y ENTREGA                   │
│  Venture Workspace · Forge DNA · localStorage ventures   │
└─────────────────────────────────────────────────────────┘
```

### Roadmap del cerebro

| Fase | Capacidad |
|------|-----------|
| **v0.1** (actual) | Heurísticas, Discovery loop, Simulator, workers mock/IA parcial |
| **v0.2** | Intelligence con LLM opcional; Simulator calibrado con datos reales del usuario |
| **v0.3** | Agentes autónomos por worker; memoria vectorial en Knowledge |
| **v1.0** | Cerebro unificado: un modelo orquestador que respeta esta especificación |

### Cómo usar esta especificación

1. Lee `01_principles.md` y `02_decision_system.md` primero
2. Profundiza en el módulo que vayas a extender
3. Cualquier cambio de comportamiento debe actualizar el doc correspondiente
4. La IA futura debe cargar estos documentos como system context

### Ubicación en el repo

```
docs/brain/
lib/discovery/
lib/intelligence/
lib/venture-simulator/
lib/workers/
lib/knowledge/
lib/dna/
```

---

*ForgeOS no sustituye al fundador humano. Lo equipa para decidir mejor.*
