# Repository contracts — PROGRAM 6010

Ports live next to aggregates (`repository.ts`) and are re-listed under `src/core/domain/ports/`.

| Port | Key methods |
|------|-------------|
| WorkspaceRepository | getById, save, delete |
| VentureRepository | getById, listByWorkspace, save, delete |
| MissionRepository | getById, listByWorkspace, listByVenture, save, delete |
| DecisionRepository | getById, listByMission, listByWorkspace, save, delete |
| ArtifactRepository | getById, listByMission, listByWorkspace, save, delete |
| ProductRepository | getById, listByVenture, listByWorkspace, save, delete |
| OutputRepository | getById, listByMission, listByWorkspace, save, delete |
| CodebaseRepository | getById, listByMission, listByWorkspace, save, delete |
| BuildRepository | getById, listByCodebase, listByMission, listByWorkspace, save, delete |
| PreviewRepository | getById, listByBuild, listByMission, listByWorkspace, save, delete |
| ReleaseRepository | getById, listByMission, listByWorkspace, save, delete |
| DeploymentRepository | getById, listByRelease, listByMission, listByWorkspace, save, delete |

**No Supabase (or other) implementation in PROGRAM 6010.** Adapters may add in-memory fakes in tests later.
