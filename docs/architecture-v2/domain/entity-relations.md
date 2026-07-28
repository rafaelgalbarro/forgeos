# Entity relations — PROGRAM 6010

```
Workspace 1──* Venture
Workspace 1──* Mission
Founder *──1 Workspace (ownerFounderId)
Venture *──? Mission (activeMissionId)
Venture 1──* Product
Product 1──* Output
Mission 1──* Decision
Mission 1──* Artifact
Mission 1──* Output
Mission 1──* Codebase
Codebase 1──* Build
Build 1──* Preview
Build 1──* Release
Release 1──* Deployment
Venture 1──* Operation
Workspace 1──* EvolutionProposal
```

## Notes

- All tenant-scoped aggregates carry `workspaceId`.
- `Output.sourceArtifactIds` links knowledge artifacts without embedding content.
- `Codebase.fileRefs` are path/checksum inventory only.
- Evolution proposals reference optional `ventureId` / `missionId` but never execute themselves.
