import type { Venture } from "./entity";
import type { VentureId, WorkspaceId } from "../shared/ids";

export interface VentureRepository {
  getById(id: VentureId): Promise<Venture | null>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Venture[]>;
  save(venture: Venture): Promise<void>;
  delete(id: VentureId): Promise<void>;
}
