import "server-only";

import fs from "node:fs";
import path from "node:path";

export type DailyCandidate = {
  ticker: string;
  region: "US" | "EU";
  score: number;
  changePct: number;
  relativeVolume: number;
  price: number;
  badges: string[];
  reason: string;
};

export type DailyCandidateSnapshot = {
  updatedAt: string;
  session: "overnight" | "europe_open" | "us_premarket" | "active" | "close";
  overnightTop200: DailyCandidate[];
  europeTop30: DailyCandidate[];
  usTop30: DailyCandidate[];
  activePool: string[];
  universeSize: number;
};

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const FILE = path.join(CACHE_DIR, "daily-candidates.json");
const MARKERS = path.join(CACHE_DIR, "pipeline-markers.json");

const EMPTY: DailyCandidateSnapshot = {
  updatedAt: new Date(0).toISOString(),
  session: "overnight",
  overnightTop200: [],
  europeTop30: [],
  usTop30: [],
  activePool: [],
  universeSize: 0,
};

export function readDailyCandidates(): DailyCandidateSnapshot {
  try {
    if (!fs.existsSync(FILE)) return { ...EMPTY };
    return JSON.parse(fs.readFileSync(FILE, "utf8")) as DailyCandidateSnapshot;
  } catch {
    return { ...EMPTY };
  }
}

export function writeDailyCandidates(snap: DailyCandidateSnapshot): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(snap, null, 2), "utf8");
}

export function getActiveCandidateTickers(): string[] {
  const snap = readDailyCandidates();
  if (snap.activePool.length >= 10) return snap.activePool;
  const merged = [
    ...snap.europeTop30.map((c) => c.ticker),
    ...snap.usTop30.map((c) => c.ticker),
    ...snap.overnightTop200.map((c) => c.ticker),
  ];
  return [...new Set(merged)].slice(0, 60);
}

export function readPipelineMarkers(): Record<string, string> {
  try {
    if (!fs.existsSync(MARKERS)) return {};
    return JSON.parse(fs.readFileSync(MARKERS, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

export function markPipelineSession(session: string, dayKey: string): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const prev = readPipelineMarkers();
  fs.writeFileSync(MARKERS, JSON.stringify({ ...prev, [session]: dayKey }, null, 2), "utf8");
}

export function alreadyRanToday(session: string, dayKey: string): boolean {
  return readPipelineMarkers()[session] === dayKey;
}
