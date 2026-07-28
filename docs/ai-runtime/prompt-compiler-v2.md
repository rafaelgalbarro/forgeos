# Prompt Compiler v2

Combines context layers before every AI call:

- Founder Prompt
- Build Context & Build DNA
- Memory & Knowledge
- Timeline & Decision Graph
- Research & Product & Architecture
- Conversation History
- Policies & Security constraints

## Security

Built-in policies prevent exposure of API keys, chain-of-thought, and unsanitized sensitive prompts.

## Usage

```typescript
import { compilePromptV2 } from "@/lib/ai-runtime/prompt-compiler/v2";

const compiled = compilePromptV2({ task, userInput, context });
```
