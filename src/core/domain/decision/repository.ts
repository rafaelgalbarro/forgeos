import type { Decision } from "./entity";
import type { DecisionId, MissionId, WorkspaceId } from "../shared/ids";

export interface DecisionRepository {
  getById(id: DecisionId): Promise<Decision | null>;
  listByMission(missionId: MissionId): Promise<Decision[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Decision[]>;
  save(decision: Decision): Promise<void>;
  delete(id: DecisionId): Promise<void>;
}
