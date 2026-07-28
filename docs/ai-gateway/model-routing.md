# Model Routing

El router (`lib/ai-gateway/router.ts`) selecciona proveedor según tarea.

| Tarea | Preferido | Fallback |
|-------|-----------|----------|
| research | anthropic, openai | google, mock |
| product | anthropic | openai, mock |
| ceo | anthropic, openai | mock |
| board | anthropic | openai, mock |
| strategy | anthropic, openai | google, mock |
| build-plan | anthropic, openai | mock |
| legal | anthropic | openai, mock |
| marketing | openai, google | anthropic, mock |
| code | anthropic, openai | groq, mock |
| classification | groq, mistral | mock |

Variables globales:

- `AI_DEFAULT_PROVIDER`
- `AI_FALLBACK_PROVIDER`
- `AI_ENABLE_MOCK_FALLBACK`

Políticas completas en `lib/ai-gateway/model-policy.ts`.
