import type { Mission } from "./entity";
import type { MissionId, VentureId, WorkspaceId } from "../shared/ids";

export interface MissionRepository {
  getById(id: MissionId): Promise<Mission | null>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Mission[]>;
  listByVenture(ventureId: VentureId): Promise<Mission[]>;
  save(mission: Mission): Promise<void>;
  delete(id: MissionId): Promise<void>;
}
