import "server-only";

import fs from "fs";
import path from "path";
import {
  createFileInvestmentMemoryRepository as createFileInvestmentMemoryRepositoryWithFs,
  type InvestmentMemoryRepository,
} from "./investment-memory-repository";

export type {
  InvestmentMemoryQuery,
  InvestmentMemoryRepository,
} from "./investment-memory-repository";

export function defaultInvestmentMemoryPath(rootDir = process.cwd()): string {
  return path.join(rootDir, ".forgeos", "v2-store", "investment-memory.json");
}

export function createFileInvestmentMemoryRepository(
  filePath: string,
): InvestmentMemoryRepository {
  return createFileInvestmentMemoryRepositoryWithFs(filePath, fs);
}

export function createDefaultInvestmentMemoryRepository(
  rootDir = process.cwd(),
): InvestmentMemoryRepository {
  return createFileInvestmentMemoryRepository(defaultInvestmentMemoryPath(rootDir));
}
