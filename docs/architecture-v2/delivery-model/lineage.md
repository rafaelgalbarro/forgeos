# Lineage / Version Graph

Answers:

1. Which artifacts created this version?
2. What change created the codebase?
3. Which build compiled it?
4. Which preview runs it?
5. Which release contains it?
6. Where is it deployed?

## API

- `buildVersionLineage(missionId, stores)`
- `answerLineageQuestions(lineage)`
- `findPath(lineage, fromId, toId)`
- `analyzeArtifactChange(...)` → Change Plan (invalidate only when needed; approval when downstream approved)

## E2E fixture

`runDeliveryPipelineE2E()` — mission `mission-6050-delivery-e2e`.
