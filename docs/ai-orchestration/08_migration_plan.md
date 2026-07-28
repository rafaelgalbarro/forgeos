# Migration Plan

## Done (3.1)

- Orchestration pipeline
- CEO / Board / Build adapters
- Gateway task policies
- Mocks for CEO_BRIEF, BOARD_DEBATE, BUILD_ARCHITECTURE

## Next

- Wire adapters to CEO Office UI (when approved)
- Wire Board panel to `runBoardAiTask`
- Wire Build Engine to `runBuildAiTask`
- Dashboard technical panel (optional)

## Add a new task

1. Add `OrchestrationTaskId` in `types.ts`
2. Register in `task-registry.ts`
3. Add gateway policy in `model-policy.ts`
4. Add validator if new output shape
5. Add mock in `mocks.ts`
6. Expose via platform adapter

## Add a new provider

See `docs/ai-gateway/providers.md` — orchestration never changes.
