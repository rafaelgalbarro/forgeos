/**
 * Portfolio repository port — PROGRAM 6110
 */

import type { PortfolioId, WorkspaceId } from "../shared/ids";
import type { PortfolioProps } from "./aggregate";

export interface PortfolioRepository {
  getById(id: PortfolioId | string): Promise<PortfolioProps | null>;
  listByWorkspace(workspaceId: WorkspaceId | string): Promise<PortfolioProps[]>;
  save(portfolio: PortfolioProps): Promise<void>;
}
