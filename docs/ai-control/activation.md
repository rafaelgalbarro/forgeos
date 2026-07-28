# Activación de IA Real

## Condición de activación

La IA real solo se activa cuando **todas** estas condiciones se cumplen:

```
ENABLE_REAL_AI=true
AND (ENABLE_DESIGN_PARTNER_AI=true OR DESIGN_PARTNER_MODE=true OR API keys configuradas)
```

Por defecto `ENABLE_REAL_AI=false` — el sistema opera en modo simulación sin cambios en Sprint 1-3.

## Variables de entorno

```env
ENABLE_REAL_AI=false
ENABLE_DESIGN_PARTNER_AI=false
DESIGN_PARTNER_MODE=false

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
```

Alias aceptados: `GOOGLE_AI_API_KEY` para Gemini.

## Pasos para staging

1. Copiar `.env.example` a `.env.local`
2. Configurar al menos una API key de proveedor
3. Establecer `ENABLE_REAL_AI=true`
4. Para Design Partners sin keys propias: `ENABLE_DESIGN_PARTNER_AI=true`
5. Reiniciar el servidor: `npm run reset:dev`
6. Verificar en `/ai` que el modo muestre **IA REAL**

## Proveedores Sprint 4

| Proveedor | Variable | Adaptador |
|-----------|----------|-----------|
| OpenAI | `OPENAI_API_KEY` | `lib/ai-runtime/providers/openai-compatible-base.ts` |
| Claude | `ANTHROPIC_API_KEY` | `lib/ai-runtime/providers/anthropic-provider.ts` |
| Gemini | `GEMINI_API_KEY` | `lib/ai-runtime/providers/gemini-provider.ts` |
| OpenRouter | `OPENROUTER_API_KEY` | `lib/ai-runtime/providers/openai-compatible-base.ts` |

## Streaming y fallback

- `ENABLE_STREAMING=true` (default) — streaming simulado post-ejecución
- `ENABLE_MULTI_PROVIDER_ROUTING=true` — cadena de fallback visible en `/ai`
- Telemetría en `lib/ai-runtime/telemetry/v2.ts`

## Workspace context

El contexto de workspace (Sprint 1) fluye vía `mergeWorkspaceIntoAiContext` en:

- `lib/ai-orchestration/runtime-adapter.ts`
- `app/api/ai/run/route.ts`
