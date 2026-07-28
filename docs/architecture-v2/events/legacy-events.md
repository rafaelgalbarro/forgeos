# Legacy Events

Existing buses are **wrapped**, not replaced:

| Source | Adapter |
|--------|---------|
| Runtime Event Bus | `adaptRuntimeEvent` / `wireRuntimeEventBus` |
| Live Mission emitter | `adaptLiveMissionEvent` / `ensureLiveMissionCanonicalBridge` |
| Mission history | `adaptMissionHistoryEntry` |
| Build pipeline | `adaptBuildPipelineEvent` |
| Preview runtime | `adaptPreviewRuntimeEvent` |
| Deployment | `adaptDeploymentEvent` |
| Factories | `adaptFactoryEvent` |

Each adapter sets `originalPayload` + `sourceEventRef` so originals are not lost during transition.

Live Mission continues to show **real** activity; the bridge mirrors emissions into the canonical event log for audit/projections.
