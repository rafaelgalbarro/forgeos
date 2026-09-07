/**
 * Append-only versioned research memory — compare opinion over time.
 * Never mutates prior entries; DEMO not used.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import path from "path";
import type {
  ResearchMemoryEntry,
  ResearchMemoryIndex,
  ResearchScores,
  EngineRunResult,
} from "./types";

const MEMORY_DIR_REL = path.join(".forgeos", "research", "memory");

function memoryDir(cwd = process.cwd()): string {
  return path.join(cwd, MEMORY_DIR_REL);
}

function indexPath(cwd = process.cwd()): string {
  return path.join(memoryDir(cwd), "index.json");
}

function entryPath(id: string, cwd = process.cwd()): string {
  return path.join(memoryDir(cwd), `${id}.json`);
}

function emptyIndex(): ResearchMemoryIndex {
  return {
    updatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    ids: [],
  };
}

export function readResearchMemoryIndex(cwd = process.cwd()): ResearchMemoryIndex {
  const file = indexPath(cwd);
  if (!existsSync(file)) return emptyIndex();
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<ResearchMemoryIndex>;
    return {
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      ids: Array.isArray(raw.ids) ? raw.ids.filter((x): x is string => typeof x === "string") : [],
    };
  } catch {
    return emptyIndex();
  }
}

export function readResearchMemoryEntry(
  id: string,
  cwd = process.cwd(),
): ResearchMemoryEntry | null {
  const file = entryPath(id, cwd);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as ResearchMemoryEntry;
  } catch {
    return null;
  }
}

export function listResearchMemoryEntries(options?: {
  readonly symbol?: string;
  readonly limit?: number;
  readonly cwd?: string;
}): readonly ResearchMemoryEntry[] {
  const cwd = options?.cwd ?? process.cwd();
  const index = readResearchMemoryIndex(cwd);
  const limit = options?.limit ?? 50;
  const symbol = options?.symbol?.toUpperCase();
  const out: ResearchMemoryEntry[] = [];
  for (let i = index.ids.length - 1; i >= 0 && out.length < limit; i--) {
    const id = index.ids[i]!;
    const entry = readResearchMemoryEntry(id, cwd);
    if (!entry) continue;
    if (symbol && entry.symbol !== symbol) continue;
    out.push(entry);
  }
  return out;
}

/**
 * Append a new immutable memory version. Never overwrites prior entry files.
 */
export function appendResearchMemory(input: {
  readonly symbol: string;
  readonly opinion: string;
  readonly scores: ResearchScores;
  readonly engines: readonly EngineRunResult[];
  readonly cwd?: string;
}): ResearchMemoryEntry {
  const cwd = input.cwd ?? process.cwd();
  const dir = memoryDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const symbol = input.symbol.toUpperCase();
  const prior = listResearchMemoryEntries({ symbol, limit: 1, cwd });
  const version = (prior[0]?.version ?? 0) + 1;
  const createdAt = new Date().toISOString();
  const id = `rm-${symbol}-${version}-${createdAt.replace(/[:.]/g, "")}`;

  const entry: ResearchMemoryEntry = {
    id,
    version,
    symbol,
    createdAt,
    overallScore: input.scores.overall.value,
    opinion: input.opinion,
    scoresSnapshot: input.scores.scores,
    engineStatuses: input.engines.map((e) => ({
      engineId: e.engineId,
      status: e.status,
    })),
  };

  const tmpEntry = `${entryPath(id, cwd)}.tmp`;
  writeFileSync(tmpEntry, JSON.stringify(entry, null, 2), "utf8");
  renameSync(tmpEntry, entryPath(id, cwd));

  const index = readResearchMemoryIndex(cwd);
  // Append-only: never remove or rewrite prior ids
  const next: ResearchMemoryIndex = {
    updatedAt: createdAt,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    ids: [...index.ids, id],
  };
  const tmpIdx = `${indexPath(cwd)}.tmp`;
  writeFileSync(tmpIdx, JSON.stringify(next, null, 2), "utf8");
  renameSync(tmpIdx, indexPath(cwd));

  return entry;
}

/** Compare two memory opinions for the same symbol (newer vs older). */
export function compareResearchMemory(
  newer: ResearchMemoryEntry,
  older: ResearchMemoryEntry,
): {
  readonly symbol: string;
  readonly scoreDelta: number | null;
  readonly opinionChanged: boolean;
  readonly note: string;
} {
  const scoreDelta =
    newer.overallScore != null && older.overallScore != null
      ? newer.overallScore - older.overallScore
      : null;
  return {
    symbol: newer.symbol,
    scoreDelta,
    opinionChanged: newer.opinion !== older.opinion,
    note:
      scoreDelta == null
        ? "Score delta NO_DATA"
        : `Overall ${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(1)} since v${older.version}`,
  };
}
