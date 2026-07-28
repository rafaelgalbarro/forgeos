# Memory Sharing

Every mesh decision generates:

| Artifact | Storage |
|----------|---------|
| Knowledge refs | `MeshMemoryRecord.knowledgeRefs` |
| Decision Graph | `intelligence-layer/decisions` + executive graph |
| Timeline | `intelligence-layer/history` |
| Mesh Memory | `STORAGE_KEYS.executiveMeshSessions` |
| Reasoning | `MeshMemoryRecord.reasoning` |
| Confidence | `MeshMemoryRecord.confidence` |
| Owner | `MeshMemoryRecord.owner` |
| Contributors | `MeshMemoryRecord.contributors` |

## API

```ts
import { meshGetMemoryRecords } from "@/lib/executive-mesh";

const records = meshGetMemoryRecords("demo-venture-vandl");
```

Context is never lost — all pipeline stages are recorded in `pipelineStages`.
