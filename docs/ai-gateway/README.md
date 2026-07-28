# ForgeOS AI Gateway

Capa central multi-proveedor para todas las tareas de IA en ForgeOS.

## Principio

Ningún módulo debe llamar directamente a OpenAI, Anthropic u otros proveedores.
Toda llamada pasa por `lib/ai-gateway/` o por rutas server `app/api/ai/`.

## Uso rápido

```ts
import { completeAITask } from "@/lib/ai-gateway/router";

const result = await completeAITask({
  task: "research",
  system: "...",
  user: "...",
});
```

## API HTTP

`POST /api/ai/run`

```json
{
  "task": "research",
  "input": "Analiza el mercado de...",
  "context": { "system": "..." },
  "provider": "anthropic"
}
```

## Módulos conectados

- Research (`lib/ai/research-provider.ts`)
- Product (`lib/ai/provider.ts`)

## Pendientes

CEO, Board, Legal, Marketing, Build Plan, Forge Capital, Forge Intelligence.
