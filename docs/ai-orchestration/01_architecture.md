# Architecture

## Layers

1. **AI Orchestration** (`lib/ai-orchestration/`) — context, validation, memory, decisions
2. **AI Gateway** (`lib/ai-gateway/`) — provider routing only
3. **Platform adapters** — CEO, Board, Build facades

## Why no direct provider calls

- Single routing policy
- Cost guard in one place
- Execution memory for Intelligence Layer
- Decision graph integration
- Mock fallback consistency
