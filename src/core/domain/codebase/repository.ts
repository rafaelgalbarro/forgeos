import type { Codebase } from "./entity";
import type { CodebaseId, MissionId, WorkspaceId } from "../shared/ids";

export interface CodebaseRepository {
  getById(id: CodebaseId): Promise<Codebase | null>;
  listByMission(missionId: MissionId): Promise<Codebase[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Codebase[]>;
  save(codebase: Codebase): Promise<void>;
  delete(id: CodebaseId): Promise<void>;
}
