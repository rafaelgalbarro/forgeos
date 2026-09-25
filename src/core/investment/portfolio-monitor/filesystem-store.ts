import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { PortfolioMonitorSnapshotStore } from "./application";
import {
  ensurePortfolioMonitorSnapshot,
  type PortfolioMonitorSnapshot,
} from "./domain";

/** Filesystem-backed snapshot store — Node runtime only. */
export class FilePortfolioMonitorStore implements PortfolioMonitorSnapshotStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<PortfolioMonitorSnapshot | null> {
    try {
      const content = await readFile(this.filePath, "utf8");
      return ensurePortfolioMonitorSnapshot(JSON.parse(content) as PortfolioMonitorSnapshot);
    } catch {
      return null;
    }
  }

  async save(snapshot: PortfolioMonitorSnapshot): Promise<void> {
    const safe = ensurePortfolioMonitorSnapshot(snapshot);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(safe, null, 2), "utf8");
  }
}

export function defaultPortfolioMonitorStorePath(): string {
  return ".forgeos/investment/portfolio-monitor-snapshot.json";
}
