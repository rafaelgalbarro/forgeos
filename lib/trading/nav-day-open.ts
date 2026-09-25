/**
 * Day-open NAV persistence (Europe/Madrid) + per-broker daily drawdown STOP.
 *
 * dailyPnlUSD = current NAV − NAV registered at first read of the Madrid calendar day.
 * Never use IBKR UnrealizedPnL / RealizedPnL for daily drawdown.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";

const MADRID_TZ = "Europe/Madrid";
const NAV_DAY_OPEN_FILE = path.resolve(
  process.cwd(),
  ".forgeos",
  "cache",
  "nav-day-open.json",
);

export type BrokerId = "ibkr" | "alpaca";

type DayOpenEntry = {
  dateKey: string;
  openingNav: number;
  registeredAt: string;
};

type BrokerDayStop = {
  dateKey: string;
  stopped: true;
  reason: string;
  openingNav: number;
  currentNav: number;
  dailyPnlPct: number;
  at: string;
};

type Store = {
  opening: Partial<Record<BrokerId, DayOpenEntry>>;
  stops: Partial<Record<BrokerId, BrokerDayStop>>;
};

function madridDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function emptyStore(): Store {
  return { opening: {}, stops: {} };
}

function loadStore(): Store {
  try {
    if (!fs.existsSync(NAV_DAY_OPEN_FILE)) return emptyStore();
    const raw = JSON.parse(fs.readFileSync(NAV_DAY_OPEN_FILE, "utf8")) as Partial<Store>;
    return {
      opening: raw.opening && typeof raw.opening === "object" ? raw.opening : {},
      stops: raw.stops && typeof raw.stops === "object" ? raw.stops : {},
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(store: Store): void {
  try {
    fs.mkdirSync(path.dirname(NAV_DAY_OPEN_FILE), { recursive: true });
    fs.writeFileSync(NAV_DAY_OPEN_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.warn(
      "[nav-day-open] persist failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Resolve daily P&L from day-open NAV (Madrid calendar day).
 * First read of the day: register current NAV and return dailyPnlUSD = 0.
 */
export function resolveDayOpenDailyPnl(
  broker: BrokerId,
  currentNav: number,
): {
  dailyPnlUSD: number;
  openingNav: number;
  dateKey: string;
  isFirstOfDay: boolean;
} {
  const dateKey = madridDateKey();
  const store = loadStore();
  const existing = store.opening[broker];

  if (existing?.dateKey === dateKey && Number.isFinite(existing.openingNav) && existing.openingNav > 0) {
    const openingNav = existing.openingNav;
    return {
      dailyPnlUSD: Number.isFinite(currentNav) ? currentNav - openingNav : 0,
      openingNav,
      dateKey,
      isFirstOfDay: false,
    };
  }

  const openingNav = Number.isFinite(currentNav) && currentNav > 0 ? currentNav : 0;
  if (openingNav > 0) {
    store.opening[broker] = {
      dateKey,
      openingNav,
      registeredAt: new Date().toISOString(),
    };
    if (store.stops[broker]?.dateKey !== dateKey) {
      delete store.stops[broker];
    }
    saveStore(store);
    console.log(
      `[nav-day-open] ${broker} registered opening NAV $${openingNav.toFixed(2)} for ${dateKey}`,
    );
  }

  return {
    dailyPnlUSD: 0,
    openingNav,
    dateKey,
    isFirstOfDay: true,
  };
}

export function getDayOpeningNav(broker: BrokerId): number | null {
  const store = loadStore();
  const entry = store.opening[broker];
  if (entry?.dateKey === madridDateKey() && entry.openingNav > 0) return entry.openingNav;
  return null;
}

export function isBrokerDayStopped(broker: BrokerId): boolean {
  const stop = loadStore().stops[broker];
  return Boolean(stop?.stopped && stop.dateKey === madridDateKey());
}

export function getBrokerDayStopReason(broker: BrokerId): string {
  const stop = loadStore().stops[broker];
  if (stop?.stopped && stop.dateKey === madridDateKey()) return stop.reason;
  return "";
}

export function getBrokerDayStop(broker: BrokerId): BrokerDayStop | null {
  const stop = loadStore().stops[broker];
  if (stop?.stopped && stop.dateKey === madridDateKey()) return stop;
  return null;
}

/** Activate per-broker day STOP. Returns true if newly activated (send Telegram once). */
export function activateBrokerDayStop(args: {
  broker: BrokerId;
  reason: string;
  openingNav: number;
  currentNav: number;
  dailyPnlPct: number;
}): boolean {
  const dateKey = madridDateKey();
  const store = loadStore();
  const existing = store.stops[args.broker];
  if (existing?.stopped && existing.dateKey === dateKey) {
    return false;
  }
  store.stops[args.broker] = {
    dateKey,
    stopped: true,
    reason: args.reason,
    openingNav: args.openingNav,
    currentNav: args.currentNav,
    dailyPnlPct: args.dailyPnlPct,
    at: new Date().toISOString(),
  };
  saveStore(store);
  console.error(
    `[Risk/DayStop] ${args.broker.toUpperCase()} STOP: ${args.reason} ` +
      `(open=$${args.openingNav.toFixed(2)} now=$${args.currentNav.toFixed(2)} ` +
      `dd=${args.dailyPnlPct.toFixed(1)}%)`,
  );
  return true;
}

/** True if a global RiskManager halt reason is IBKR daily-drawdown (must not block Alpaca). */
export function isIbkrDrawdownHaltReason(reason: string): boolean {
  return /drawdown|p[eé]rdida diaria|risk stop/i.test(reason ?? "");
}
