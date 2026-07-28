# Decision Flow

```
Founder Request
      ↓
     CEO
      ↓
 ¿Necesita debate?
      ↓
   SI ─────────────────────── NO
      ↓                        ↓
Executive Board            CEO responde
      ↓                        directamente
Especialistas
      ↓
Consensus Engine
      ↓
Decision Graph
      ↓
Execution Plan
      ↓
Runtime
      ↓
Response + Memory
```

## Debate triggers

- `urgency: "high"`
- `requiresDebate: true`
- CEO summary contains risk/conflict keywords

## Output

`MeshPipelineResult` includes stages, decisionId, executionPlan, memoryRecordId, scores.
