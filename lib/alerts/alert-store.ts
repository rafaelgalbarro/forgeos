import "server-only";

import fs from "node:fs";
import path from "node:path";

export type AlertType =
  | "price"
  | "indicator"
  | "pattern"
  | "volume"
  | "score"
  | "insider"
  | "gap";

export type AlertRule = {
  id: string;
  type: AlertType;
  ticker: string;
  label: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
  /** Type-specific params */
  params: {
    operator?: "below" | "above" | "crosses";
    value?: number;
    indicator?: "rsi";
    patternName?: string;
    volumeMultiplier?: number;
    minScore?: number;
    minInsiderUsd?: number;
    minGapPct?: number;
  };
};

export type WatchlistEntry = {
  ticker: string;
  addedAt: string;
  note?: string;
};

export type AlertsState = {
  watchlist: WatchlistEntry[];
  alerts: AlertRule[];
  cycleQueue: string[];
  updatedAt: string;
};

const STATE_FILE = path.resolve(process.cwd(), ".forgeos", "alerts-state.json");

const DEFAULT_STATE: AlertsState = {
  watchlist: [
    { ticker: "NVDA", addedAt: new Date().toISOString(), note: "Watchlist IA" },
    { ticker: "AAPL", addedAt: new Date().toISOString() },
    { ticker: "SPY", addedAt: new Date().toISOString() },
  ],
  alerts: [],
  cycleQueue: [],
  updatedAt: new Date().toISOString(),
};

export function loadAlertsState(): AlertsState {
  try {
    if (!fs.existsSync(STATE_FILE)) return { ...DEFAULT_STATE };
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as AlertsState;
    return {
      watchlist: raw.watchlist ?? DEFAULT_STATE.watchlist,
      alerts: raw.alerts ?? [],
      cycleQueue: raw.cycleQueue ?? [],
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveAlertsState(state: AlertsState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
}

export function updateAlertsState(mutator: (state: AlertsState) => AlertsState): AlertsState {
  const next = mutator(loadAlertsState());
  saveAlertsState(next);
  return next;
}
