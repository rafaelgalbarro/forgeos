# Architecture — Executive Intelligence Mesh

## Layers

```
lib/executive-mesh/          # Coordination layer (RC3.5)
  departments.ts             # 25 departments
  decision-pipeline.ts       # Founder → CEO → Board → Runtime
  collaboration-engine.ts    # Cross-department chains
  meetings/                  # Automatic executive meetings
  disagreement/              # Debate engine
  scores/                    # Executive scores
  adapters/
    orchestration-adapter.ts # → ai-orchestration, board-runtime
    intelligence-adapter.ts  # → intelligence-layer
    runtime-adapter.ts       # → execution dispatch (mock)
```

## Dependency rules

- `executive-mesh` may import: `ai-orchestration`, `intelligence-layer`, `platform/*`, `intelligence/*`
- `executive-mesh` must NOT import: `ceo-office/index`, `components/*`
- Low-level modules must NOT import `executive-mesh`

## Integration

| System | Adapter |
|--------|---------|
| AI Orchestration | `orchestration-adapter` |
| Decision Graph | `intelligence-adapter` + `writeConsensusDecision` |
| Runtime | `runtime-adapter` |
| AI Runtime | Independent — no circular wiring |
