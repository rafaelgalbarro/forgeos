import type { Deployment } from "./entity";
import type { DeploymentId, MissionId, ReleaseId, WorkspaceId } from "../shared/ids";

export interface DeploymentRepository {
  getById(id: DeploymentId): Promise<Deployment | null>;
  listByRelease(releaseId: ReleaseId): Promise<Deployment[]>;
  listByMission(missionId: MissionId): Promise<Deployment[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Deployment[]>;
  save(deployment: Deployment): Promise<void>;
  delete(id: DeploymentId): Promise<void>;
}
