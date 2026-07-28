# Streaming (RC6)

Optional progressive response delivery.

## Configuration

`ENABLE_STREAMING=true` (default)

## API

```typescript
import { streamAIRuntime } from "@/lib/ai-runtime";

for await (const chunk of streamAIRuntime(request)) {
  console.log(chunk.delta);
}
```

Sessions tracked in `lib/ai-runtime/streaming/` for live mode observability.
