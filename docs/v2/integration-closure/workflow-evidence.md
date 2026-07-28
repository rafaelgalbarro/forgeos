# Workflow Evidence

Orchestration kernel plan created for ATLAS mission, outputs selected/approved, plan approved, runToCompletion → `kernelStatus=completed`.

Controlled failure: `failNode(n_brand)` then `recover({ action: "retry", nodeId: "n_brand" })` — PASS.

Workflow plan persisted under `store.workflowPlans[missionId]` and survives reload (see persistence-recovery).
