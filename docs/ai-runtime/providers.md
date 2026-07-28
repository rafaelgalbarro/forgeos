# Provider Adapters (RC6)

Decoupled provider adapters in `lib/ai-runtime/providers/`.

## Implemented

| Provider | Adapter | Status |
|----------|---------|--------|
| OpenAI | `openai-compatible-base` | Live |
| Anthropic Claude | `anthropic-provider` | Live |
| Google Gemini | `gemini-provider` | Live |
| OpenRouter | `openai-compatible-base` | Live |
| DeepSeek | `openai-compatible-base` | Live |
| Mistral | `openai-compatible-base` | Live |
| Meta Llama (Groq) | `openai-compatible-base` | Live |
| Azure OpenAI | `openai-compatible-base` | Live |
| AWS Bedrock | `aws-bedrock-provider` | Stub (health only) |
| Vertex AI | `vertex-ai-provider` | Live |
| Ollama | `openai-compatible-base` | Live |
| LM Studio | `openai-compatible-base` | Live |
| MCP | `mcp-provider` | Placeholder |

## Interface

Each adapter implements: `connect()`, `health()`, `models()`, `estimateCost()`, `estimateLatency()`, `execute()`, `cancel()`, `retry()`, `telemetry()`.
