# Collaboration

## Actions

Each department can: `consult`, `debate`, `delegate`, `request_review`, `escalate`, `reject`, `approve`, `consensus`.

## Default chains

- CEO → CTO → Architecture → Backend → Infrastructure
- QA reviews Backend
- Security validates Architecture
- Legal reviews Product
- Finance ↔ Capital → CFO

## API

```ts
import { runCollaborationChain, getCollaborationGraph } from "@/lib/executive-mesh";

const turns = runCollaborationChain("Release VANDL v1");
const graph = getCollaborationGraph();
```

Never respond in isolation — every turn references a target department.
