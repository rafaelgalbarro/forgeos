import type { Build } from "./entity";
import type { BuildId, CodebaseId, MissionId, WorkspaceId } from "../shared/ids";

export interface BuildRepository {
  getById(id: BuildId): Promise<Build | null>;
  listByCodebase(codebaseId: CodebaseId): Promise<Build[]>;
  listByMission(missionId: MissionId): Promise<Build[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Build[]>;
  save(build: Build): Promise<void>;
  delete(id: BuildId): Promise<void>;
}
