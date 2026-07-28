import type { Output } from "./entity";
import type { MissionId, OutputId, WorkspaceId } from "../shared/ids";

export interface OutputRepository {
  getById(id: OutputId): Promise<Output | null>;
  listByMission(missionId: MissionId): Promise<Output[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Output[]>;
  save(output: Output): Promise<void>;
  delete(id: OutputId): Promise<void>;
}
