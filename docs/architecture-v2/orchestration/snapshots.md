# Snapshots

Mission Control consumes **snapshots**, not the live Kernel.

## Types

- `MissionExecutionSnapshot`
- `StageSnapshot`
- `NodeSnapshot`
- `DepartmentSnapshot`
- `ApprovalSnapshot`
- `CostSnapshot`

Built by `buildMissionExecutionSnapshot()`.

## Progress

Weighted node progress with separate:

- mission
- stage
- output
- build
- deployment

## Cost snapshot

Always includes `disclaimer` and `kind: "estimated"` unless explicitly marked actual.
