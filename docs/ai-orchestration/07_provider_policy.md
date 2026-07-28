# Provider Policy

Orchestration tasks map to AI Gateway tasks with policies in `model-policy.ts`:

| Group | Preferred | Fallback | Temp | JSON |
|-------|-----------|----------|------|------|
| CEO | anthropic, openai | mock | 0.4 | yes |
| Board | anthropic | google, openai, mock | 0.5 | yes |
| Build | anthropic, openai | mock | 0.2 | yes |
| Classification | groq, mistral | mock | 0.1 | yes |

See also `docs/ai-gateway/model-routing.md`.
