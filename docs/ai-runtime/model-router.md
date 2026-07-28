# Model Router v2

Automatic model and provider selection — business logic never chooses models manually.

## Optimizers

- `cost` — minimize spend
- `latency` — fastest response
- `quality` — highest tier models
- `balanced` — weighted composite (default)

## Features

- Multi-provider fallback chains
- Budget tracking via `AI_MONTHLY_BUDGET_USD`
- Specialty matching per task type
- Streaming and tool-calling capability detection

## Usage

```typescript
import { routeModelV2 } from "@/lib/ai-runtime/router/v2";

const decision = routeModelV2({ task: "research", optimizer: "balanced" });
```
