import type { Product } from "./entity";
import type { ProductId, VentureId, WorkspaceId } from "../shared/ids";

export interface ProductRepository {
  getById(id: ProductId): Promise<Product | null>;
  listByVenture(ventureId: VentureId): Promise<Product[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<Product[]>;
  save(product: Product): Promise<void>;
  delete(id: ProductId): Promise<void>;
}
