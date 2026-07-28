import { buildPortfolioCommandCenterReadModel } from "./query-handler";

export interface GetPortfolioCommandCenterParams {
  portfolioId: string;
  page?: number;
  pageSize?: number;
}

export function getPortfolioCommandCenter(params: GetPortfolioCommandCenterParams) {
  return buildPortfolioCommandCenterReadModel(params);
}
