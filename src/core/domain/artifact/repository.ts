import type { Artifact } from "./entity";
import type { ArtifactId, MissionId, WorkspaceId } from "../shared/ids";

export interface ArtifactRepository {
  getById(id: ArtifactId): Promise<Artifact | null>;
  listByMission(missionId: MissionId): Promise<Artifact[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Artifact[]>;
  save(artifact: Artifact): Promise<void>;
  delete(id: ArtifactId): Promise<void>;
}
