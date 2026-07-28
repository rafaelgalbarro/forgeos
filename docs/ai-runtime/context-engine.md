# Context Engine v2

Generates reusable context layers:

- **Executive Context** — portfolio-wide strategic framing
- **Department Context** — scoped to mesh department (CEO, CTO, etc.)
- **Capability Context** — capability layer execution scope
- **Skill Context** — skill governance policies
- **Execution Context** — build/execution phase

## Usage

```typescript
import { buildDepartmentContext } from "@/lib/ai-runtime/context-engine/v2";

const section = buildDepartmentContext("cto", { ventureId });
```
