import type { Release } from "./entity";
import type { MissionId, ReleaseId, WorkspaceId } from "../shared/ids";

export interface ReleaseRepository {
  getById(id: ReleaseId): Promise<Release | null>;
  listByMission(missionId: MissionId): Promise<Release[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Release[]>;
  save(release: Release): Promise<void>;
  delete(id: ReleaseId): Promise<void>;
}
