# ForgeOS RC3 — AI Operating System COMPLETADO

ForgeOS utiliza un ecosistema completo de modelos. El usuario **nunca elige el modelo** — ForgeOS decide automáticamente.

## Pipeline oficial

```
AI Gateway
  ↓
Model Router
  ↓
Provider Adapter
  ↓
Memory
  ↓
Decision Graph
  ↓
Telemetry
  ↓
Response
```

**Nunca** llamar directamente a OpenAI, Claude o Gemini desde módulos de negocio.

## Arquitectura

```
lib/ai-runtime/
  pipeline.ts          — runAIRuntime() entrada única
  router/              — model router + optimizers (cost/latency/quality)
  providers/           — adapters desacoplados (18 proveedores)
  prompt-compiler/     — Research → Product → Memory → Knowledge → Prompt
  context-engine/      — Build Context, DNA, Timeline, CEO, Workers…
  memory/              — memoria compartida (Knowledge, Timeline, Decision Graph…)
  decision-graph/      — bridge al decision graph ejecutivo
  telemetry/           — provider, modelo, tokens, coste, fallback, confianza
```

## Providers soportados

OpenAI · Anthropic Claude · Google Gemini · OpenRouter · DeepSeek · Mistral · Groq/Llama · Azure OpenAI · AWS Bedrock (stub) · Vertex AI · Cohere · xAI · Ollama · LM Studio · Local · MCP (pending) · Mock

## API

`POST /api/ai/run` — enruta por `runAIRuntime`

```json
{
  "task": "research",
  "input": "...",
  "optimizer": "balanced",
  "ventureId": "demo-venture-vandl"
}
```

## Módulos conectados

| Módulo | Entrada AI OS |
|--------|----------------|
| Research | `lib/ai/research-provider.ts` → `completeViaAIRuntime` |
| Product | `lib/ai/provider.ts` → `completeViaAIRuntime` |
| CEO/Board/Build | `lib/ai-orchestration/` (gateway + memory + telemetry) |
| API | `app/api/ai/run` → `runAIRuntime` |

## Lab

`/lab/ai-runtime` — visualiza modelos, routing, fallback, costes, providers.

## Variables

Ver `.env.example` sección **AI Runtime RC3**.

## Verificación

```bash
npm run build
npm run reset:dev
```

---

**RC3 AI Operating System COMPLETADO**
