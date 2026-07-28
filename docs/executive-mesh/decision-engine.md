# Decision Engine — RC4

Integrates:

1. `processExecutiveMeshRequest` — mesh pipeline
2. `runExecutiveProtocol` — full RC4 protocol with skills
3. Consensus via `intelligence/consensus-engine`
4. Decision graph via `intelligence-layer` + `ai-orchestration`

Skill results write to decision graph and timeline via `lib/skills/adapters/memory-adapter`.
