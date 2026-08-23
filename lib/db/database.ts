/**
 * ForgeOS persistent SQLite store.
 * Uses Node 22 `node:sqlite` (DatabaseSync) — same schema intended for better-sqlite3.
 * Path: FORGEOS_DATA_DIR/.forgeos/db.sqlite or <cwd>/.forgeos/db.sqlite
 * Production: /var/www/forgeos/.forgeos/db.sqlite
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type TradeRow = {
  id: number;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  pnl: number;
  timestamp: string;
  account: string | null;
  kind: string | null;
};

export type DailyPnlRow = {
  date: string;
  total_pnl: number;
  trades: number;
  winners: number;
  losers: number;
  win_rate: number;
};

export type PositionRow = {
  symbol: string;
  entry_price: number;
  sl: number;
  tp: number;
  account: string | null;
  timestamp: string;
  qty: number;
};

function resolveDbPath(): string {
  const envPath = process.env.FORGEOS_DB_PATH?.trim();
  if (envPath) return envPath;
  const dataRoot =
    process.env.FORGEOS_DATA_DIR?.trim() ||
    (fs.existsSync("/var/www/forgeos") ? "/var/www/forgeos" : process.cwd());
  return path.join(dataRoot, ".forgeos", "db.sqlite");
}

let dbSingleton: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (dbSingleton) return dbSingleton;
  const file = resolveDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      qty REAL NOT NULL,
      price REAL NOT NULL,
      pnl REAL NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      account TEXT,
      kind TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_pnl (
      date TEXT PRIMARY KEY,
      total_pnl REAL NOT NULL DEFAULT 0,
      trades INTEGER NOT NULL DEFAULT 0,
      winners INTEGER NOT NULL DEFAULT 0,
      losers INTEGER NOT NULL DEFAULT 0,
      win_rate REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS positions (
      symbol TEXT PRIMARY KEY,
      entry_price REAL NOT NULL,
      sl REAL NOT NULL,
      tp REAL NOT NULL,
      account TEXT,
      timestamp TEXT NOT NULL,
      qty REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_trades_ts ON trades(timestamp);
    CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
  `);
  dbSingleton = db;
  return db;
}

function madridDateKey(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

function refreshDailyPnl(date: string): DailyPnlRow {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pnl FROM trades WHERE substr(timestamp, 1, 10) = ? OR timestamp LIKE ?`,
    )
    .all(date, `${date}%`) as Array<{ pnl: number }>;

  // Prefer Madrid calendar day match via JS filter if timestamps are ISO
  const all = db.prepare(`SELECT pnl, timestamp FROM trades`).all() as Array<{
    pnl: number;
    timestamp: string;
  }>;
  const dayTrades = all.filter((t) => madridDateKey(t.timestamp) === date);
  const source = dayTrades.length > 0 ? dayTrades : rows;
  const total = source.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const winners = source.filter((t) => Number(t.pnl) > 0).length;
  const losers = source.filter((t) => Number(t.pnl) < 0).length;
  const trades = source.length;
  const winRate = trades > 0 ? winners / trades : 0;
  db.prepare(
    `INSERT INTO daily_pnl(date, total_pnl, trades, winners, losers, win_rate)
     VALUES(?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       total_pnl=excluded.total_pnl,
       trades=excluded.trades,
       winners=excluded.winners,
       losers=excluded.losers,
       win_rate=excluded.win_rate`,
  ).run(date, total, trades, winners, losers, winRate);
  return {
    date,
    total_pnl: total,
    trades,
    winners,
    losers,
    win_rate: winRate,
  };
}

export function recordClosedTrade(input: {
  symbol: string;
  side?: string;
  qty: number;
  price: number;
  pnl: number;
  account?: string | null;
  kind?: string | null;
  timestamp?: string;
}): TradeRow {
  const db = getDb();
  const ts = input.timestamp ?? new Date().toISOString();
  const side = (input.side ?? "SELL").toUpperCase();
  const info = db
    .prepare(
      `INSERT INTO trades(symbol, side, qty, price, pnl, timestamp, account, kind)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.symbol.toUpperCase(),
      side,
      input.qty,
      input.price,
      input.pnl,
      ts,
      input.account ?? null,
      input.kind ?? null,
    );
  const date = madridDateKey(ts);
  refreshDailyPnl(date);
  // Drop closed position row if present
  db.prepare(`DELETE FROM positions WHERE symbol = ?`).run(input.symbol.toUpperCase());
  const id = Number(info.lastInsertRowid);
  console.log(
    `[DB] ${input.symbol.toUpperCase()} ${input.kind ?? side} → guardado pnl=${input.pnl >= 0 ? "+" : ""}$${input.pnl.toFixed(2)}`,
  );
  return {
    id,
    symbol: input.symbol.toUpperCase(),
    side,
    qty: input.qty,
    price: input.price,
    pnl: input.pnl,
    timestamp: ts,
    account: input.account ?? null,
    kind: input.kind ?? null,
  };
}

export function upsertOpenPosition(input: {
  symbol: string;
  entryPrice: number;
  sl: number;
  tp: number;
  account?: string | null;
  qty: number;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO positions(symbol, entry_price, sl, tp, account, timestamp, qty)
     VALUES(?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET
       entry_price=excluded.entry_price,
       sl=excluded.sl,
       tp=excluded.tp,
       account=excluded.account,
       timestamp=excluded.timestamp,
       qty=excluded.qty`,
  ).run(
    input.symbol.toUpperCase(),
    input.entryPrice,
    input.sl,
    input.tp,
    input.account ?? null,
    new Date().toISOString(),
    input.qty,
  );
}

export function getDailyPnlSummary(date?: string): {
  date: string;
  totalPnl: number;
  trades: number;
  winners: number;
  losers: number;
  winRate: number;
} {
  const key = date ?? madridDateKey();
  const row = refreshDailyPnl(key);
  return {
    date: row.date,
    totalPnl: row.total_pnl,
    trades: row.trades,
    winners: row.winners,
    losers: row.losers,
    winRate: row.win_rate,
  };
}

export function listTrades(limit = 200): TradeRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, symbol, side, qty, price, pnl, timestamp, account, kind
       FROM trades ORDER BY id DESC LIMIT ?`,
    )
    .all(Math.max(1, Math.min(2000, limit))) as TradeRow[];
}

export function getPnlAggregates(): {
  daily: DailyPnlRow[];
  weeklyPnl: number;
  monthlyPnl: number;
} {
  const db = getDb();
  const daily = db
    .prepare(`SELECT date, total_pnl, trades, winners, losers, win_rate FROM daily_pnl ORDER BY date DESC LIMIT 90`)
    .all() as DailyPnlRow[];

  const all = db.prepare(`SELECT pnl, timestamp FROM trades`).all() as Array<{
    pnl: number;
    timestamp: string;
  }>;
  const now = Date.now();
  const weekMs = 7 * 24 * 3600_000;
  const monthMs = 30 * 24 * 3600_000;
  let weeklyPnl = 0;
  let monthlyPnl = 0;
  for (const t of all) {
    const ts = new Date(t.timestamp).getTime();
    if (!Number.isFinite(ts)) continue;
    if (now - ts <= weekMs) weeklyPnl += Number(t.pnl) || 0;
    if (now - ts <= monthMs) monthlyPnl += Number(t.pnl) || 0;
  }
  return { daily, weeklyPnl, monthlyPnl };
}

export function getDbFilePath(): string {
  return resolveDbPath();
}
