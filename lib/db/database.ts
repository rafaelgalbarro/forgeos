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
    CREATE TABLE IF NOT EXISTS sell_blacklist (
      symbol TEXT PRIMARY KEY,
      sold_at TEXT NOT NULL,
      account TEXT,
      expires TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_trades_ts ON trades(timestamp);
    CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
    CREATE INDEX IF NOT EXISTS idx_sell_blacklist_expires ON sell_blacklist(expires);
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
  const symbol = input.symbol.toUpperCase();
  const date = madridDateKey(ts);

  // Cap identical SELL spam: max 2 rows per (symbol, side, qty) per Madrid day
  if (side === "SELL") {
    const all = db
      .prepare(`SELECT id, symbol, side, qty, timestamp FROM trades WHERE upper(symbol) = ? AND upper(side) = 'SELL'`)
      .all(symbol) as Array<{ id: number; qty: number; timestamp: string }>;
    const same = all.filter(
      (t) => madridDateKey(t.timestamp) === date && Number(t.qty) === Number(input.qty),
    );
    if (same.length >= 2) {
      console.warn(
        `[DB] skip duplicate SELL ${symbol} qty=${input.qty} — already ${same.length} today`,
      );
      db.prepare(`DELETE FROM positions WHERE symbol = ?`).run(symbol);
      const existing = db
        .prepare(
          `SELECT id, symbol, side, qty, price, pnl, timestamp, account, kind FROM trades WHERE id = ?`,
        )
        .get(same[same.length - 1]!.id) as TradeRow;
      return existing;
    }
  }

  const info = db
    .prepare(
      `INSERT INTO trades(symbol, side, qty, price, pnl, timestamp, account, kind)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      symbol,
      side,
      input.qty,
      input.price,
      input.pnl,
      ts,
      input.account ?? null,
      input.kind ?? null,
    );
  refreshDailyPnl(date);
  // Drop closed position row if present
  db.prepare(`DELETE FROM positions WHERE symbol = ?`).run(symbol);
  const id = Number(info.lastInsertRowid);
  console.log(
    `[DB] ${symbol} ${input.kind ?? side} → guardado pnl=${input.pnl >= 0 ? "+" : ""}$${input.pnl.toFixed(2)}`,
  );
  return {
    id,
    symbol,
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

/** Symbols with at least one SELL recorded today (Madrid calendar). */
export function listSoldSymbolsToday(date?: string): string[] {
  const db = getDb();
  const key = date ?? madridDateKey();
  const all = db
    .prepare(`SELECT symbol, side, timestamp FROM trades WHERE upper(side) = 'SELL'`)
    .all() as Array<{ symbol: string; side: string; timestamp: string }>;
  return [
    ...new Set(
      all
        .filter((t) => madridDateKey(t.timestamp) === key)
        .map((t) => String(t.symbol ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

export type SellBlacklistRow = {
  symbol: string;
  sold_at: string;
  account: string | null;
  expires: string;
};

const PERMANENT_EXPIRES = "9999-12-31";

/** Next Madrid calendar day after `from` (YYYY-MM-DD). */
function nextMadridDateKey(from: string): string {
  const [y, m, d] = from.split("-").map((n) => Number(n));
  if (!y || !m || !d) return from;
  const utc = new Date(Date.UTC(y, m - 1, d + 1));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Drop rows whose expires day is strictly before today (Madrid). */
export function purgeExpiredSellBlacklist(today?: string): number {
  const db = getDb();
  const key = today ?? madridDateKey();
  const info = db.prepare(`DELETE FROM sell_blacklist WHERE expires < ?`).run(key);
  return Number(info.changes ?? 0);
}

/** Active (non-expired) symbols in sell_blacklist. */
export function listActiveSellBlacklist(today?: string): SellBlacklistRow[] {
  const db = getDb();
  const key = today ?? madridDateKey();
  purgeExpiredSellBlacklist(key);
  return db
    .prepare(
      `SELECT symbol, sold_at, account, expires FROM sell_blacklist
       WHERE expires >= ? ORDER BY symbol ASC`,
    )
    .all(key) as SellBlacklistRow[];
}

/**
 * Upsert day blacklist entry (expires = next Madrid day after sold_at).
 * Permanent seeds use expires=9999-12-31 and should not be overwritten to a short window.
 */
export function upsertSellBlacklist(input: {
  symbol: string;
  soldAt?: string;
  account?: string | null;
  permanent?: boolean;
}): void {
  const db = getDb();
  const symbol = String(input.symbol ?? "").trim().toUpperCase();
  if (!symbol) return;
  const soldAt = input.soldAt ?? new Date().toISOString();
  const soldDay = madridDateKey(soldAt);
  const expires = input.permanent ? PERMANENT_EXPIRES : nextMadridDateKey(soldDay);
  const account = input.account ?? null;

  const existing = db
    .prepare(`SELECT expires FROM sell_blacklist WHERE symbol = ?`)
    .get(symbol) as { expires: string } | undefined;
  if (existing?.expires === PERMANENT_EXPIRES && !input.permanent) {
    // Keep permanent seed — do not shorten
    return;
  }

  db.prepare(
    `INSERT INTO sell_blacklist(symbol, sold_at, account, expires)
     VALUES(?, ?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET
       sold_at=excluded.sold_at,
       account=COALESCE(excluded.account, sell_blacklist.account),
       expires=CASE
         WHEN sell_blacklist.expires = '${PERMANENT_EXPIRES}' THEN sell_blacklist.expires
         ELSE excluded.expires
       END`,
  ).run(symbol, soldAt, account, expires);
}

/** Seed permanent closed/junk tickers (INSERT OR IGNORE). */
export function seedPermanentSellBlacklist(symbols: readonly string[], account?: string | null): number {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO sell_blacklist(symbol, sold_at, account, expires)
     VALUES(?, ?, ?, ?)`,
  );
  let inserted = 0;
  for (const raw of symbols) {
    const symbol = String(raw ?? "").trim().toUpperCase();
    if (!symbol) continue;
    const info = stmt.run(symbol, now, account ?? null, PERMANENT_EXPIRES);
    if (Number(info.changes ?? 0) > 0) inserted += 1;
  }
  return inserted;
}

/** Remove from day blacklist (e.g. after new BUY). Never removes permanent seeds. */
export function removeSellBlacklistSymbol(symbol: string): boolean {
  const db = getDb();
  const key = String(symbol ?? "").trim().toUpperCase();
  if (!key) return false;
  const info = db
    .prepare(`DELETE FROM sell_blacklist WHERE symbol = ? AND expires != ?`)
    .run(key, PERMANENT_EXPIRES);
  return Number(info.changes ?? 0) > 0;
}

/**
 * Keep at most 2 rows per (symbol, side, qty) on the same Madrid day.
 * Deletes extras (highest id first) and refreshes daily_pnl for touched days.
 */
export function purgeDuplicateTradesToday(date?: string): {
  deleted: number;
  keptGroups: number;
  date: string;
} {
  const db = getDb();
  const key = date ?? madridDateKey();
  const all = db
    .prepare(
      `SELECT id, symbol, side, qty, timestamp FROM trades ORDER BY id ASC`,
    )
    .all() as Array<{
    id: number;
    symbol: string;
    side: string;
    qty: number;
    timestamp: string;
  }>;

  const groups = new Map<string, number[]>();
  for (const row of all) {
    if (madridDateKey(row.timestamp) !== key) continue;
    const gkey = `${String(row.symbol).toUpperCase()}|${String(row.side).toUpperCase()}|${Number(row.qty)}`;
    const ids = groups.get(gkey) ?? [];
    ids.push(row.id);
    groups.set(gkey, ids);
  }

  const toDelete: number[] = [];
  let keptGroups = 0;
  for (const ids of groups.values()) {
    if (ids.length <= 2) {
      if (ids.length > 0) keptGroups += 1;
      continue;
    }
    keptGroups += 1;
    // Keep the first 2 (oldest); delete the rest (repeat spam)
    toDelete.push(...ids.slice(2));
  }

  if (toDelete.length > 0) {
    const del = db.prepare(`DELETE FROM trades WHERE id = ?`);
    for (const id of toDelete) del.run(id);
    refreshDailyPnl(key);
    console.log(
      `[DB] purgeDuplicateTradesToday ${key}: deleted=${toDelete.length} groups=${groups.size}`,
    );
  }

  return { deleted: toDelete.length, keptGroups, date: key };
}
