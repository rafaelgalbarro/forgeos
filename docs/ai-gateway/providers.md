# Proveedores AI Gateway

| ID | Env key | Estado |
|----|---------|--------|
| `anthropic` | `ANTHROPIC_API_KEY` | Implementado |
| `openai` | `OPENAI_API_KEY` | Implementado |
| `google` | `GOOGLE_AI_API_KEY` | Implementado |
| `mistral` | `MISTRAL_API_KEY` | Implementado |
| `groq` | `GROQ_API_KEY` | Implementado |
| `local` | `LOCAL_AI_BASE_URL` | OpenAI-compatible |
| `mock` | `AI_ENABLE_MOCK_FALLBACK` | Siempre disponible si habilitado |

## Seguridad

Las API keys **nunca** deben exponerse en el frontend.
Solo rutas server (`app/api/**`) acceden a `process.env`.
