import type { Workspace } from "./entity";
import type { WorkspaceId } from "../shared/ids";

export interface WorkspaceRepository {
  getById(id: WorkspaceId): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
  delete(id: WorkspaceId): Promise<void>;
}
