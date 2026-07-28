import type { Preview } from "./entity";
import type { BuildId, MissionId, PreviewId, WorkspaceId } from "../shared/ids";

export interface PreviewRepository {
  getById(id: PreviewId): Promise<Preview | null>;
  listByBuild(buildId: BuildId): Promise<Preview[]>;
  listByMission(missionId: MissionId): Promise<Preview[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Preview[]>;
  save(preview: Preview): Promise<void>;
  delete(id: PreviewId): Promise<void>;
}
