/**
 * Telegram alarms for Kraken crypto engine health + stuck positions.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { readCryptoEngineHeartbeat } from "@/lib/trading/crypto/engine-heartbeat";
import {
  maxHoldMsForStrategy,
} from "@/lib/trading/crypto/reconcile";
import { readCryptoJournal } from "@/lib/trading/crypto/journal-crypto";

const DIR = path.join(process.cwd(), ".forgeos", "cache");
const RESTARTS_FILE = path.join(DIR, "crypto-engine-restarts.json");
const ALARM_STATE_FILE = path.join(DIR, "crypto-engine-alarms.json");

type AlarmState = {
  lastHeartbeatAlarmAt?: string;
  lastRestartAlarmAt?: string;
  maxHoldAlarms?: Record<string, string>;
};

function loadAlarmState(): AlarmState {
  try {
    if (!fs.existsSync(ALARM_STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(ALARM_STATE_FILE, "utf8")) as AlarmState;
  } catch {
    return {};
  }
}

function saveAlarmState(s: AlarmState): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(ALARM_STATE_FILE, JSON.stringify(s, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function recently(iso: string | undefined, ms: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && Date.now() - t < ms;
}

/** Call once per process start (standalone engine). */
export function recordCryptoEngineRestart(): void {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    let times: string[] = [];
    if (fs.existsSync(RESTARTS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(RESTARTS_FILE, "utf8")) as {
        times?: string[];
      };
      times = Array.isArray(raw.times) ? raw.times : [];
    }
    const now = new Date().toISOString();
    times.push(now);
    const cutoff = Date.now() - 10 * 60_000;
    times = times.filter((t) => Date.parse(t) >= cutoff);
    fs.writeFileSync(RESTARTS_FILE, JSON.stringify({ times }, null, 2), "utf8");

    if (times.length > 3) {
      const state = loadAlarmState();
      if (!recently(state.lastRestartAlarmAt, 10 * 60_000)) {
        state.lastRestartAlarmAt = now;
        saveAlarmState(state);
        void sendTelegramMessage(
          `🚨 <b>Kraken motor</b>: ${times.length} reinicios en 10 min — revisar forgeos-crypto-engine`,
        ).catch(() => undefined);
      }
    }
  } catch (err) {
    console.warn(
      "[CryptoAlarm] restart record:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Heartbeat stale > 5 min (call from Next.js GET or a watchdog tick). */
export async function checkCryptoHeartbeatAlarm(): Promise<void> {
  // Standalone engine writes the heartbeat — don't alarm on self
  if ((process.env.CRYPTO_ENGINE_ROLE ?? "").trim().toLowerCase() === "standalone") {
    return;
  }
  const hb = readCryptoEngineHeartbeat();
  const state = loadAlarmState();
  if (!hb) {
    if (!recently(state.lastHeartbeatAlarmAt, 15 * 60_000)) {
      state.lastHeartbeatAlarmAt = new Date().toISOString();
      saveAlarmState(state);
      await sendTelegramMessage(
        "🚨 <b>Kraken motor</b>: sin heartbeat (¿forgeos-crypto-engine caído?)",
      ).catch(() => undefined);
    }
    return;
  }
  const age = Date.now() - Date.parse(hb.updatedAt);
  if (Number.isFinite(age) && age > 5 * 60_000) {
    if (!recently(state.lastHeartbeatAlarmAt, 15 * 60_000)) {
      state.lastHeartbeatAlarmAt = new Date().toISOString();
      saveAlarmState(state);
      await sendTelegramMessage(
        `🚨 <b>Kraken motor</b>: heartbeat hace ${Math.round(age / 60_000)} min (>5 min)`,
      ).catch(() => undefined);
    }
  }
}

/** Position past max hold + 1h still open. */
export async function checkCryptoMaxHoldAlarms(): Promise<void> {
  const state = loadAlarmState();
  state.maxHoldAlarms = state.maxHoldAlarms ?? {};
  const open = new Map<string, { at: string; strategy: string }>();
  for (const t of readCryptoJournal(20_000)) {
    if (t.shadow) continue;
    const p = t.pair.toUpperCase();
    if (t.side === "BUY") open.set(p, { at: t.at, strategy: String(t.strategy) });
    if (t.side === "SELL") open.delete(p);
  }
  const now = Date.now();
  for (const [pair, meta] of open) {
    const opened = Date.parse(meta.at);
    if (!Number.isFinite(opened)) continue;
    const maxHold = maxHoldMsForStrategy(meta.strategy);
    const overdue = now - opened - maxHold;
    if (overdue < 60 * 60_000) continue;
    if (recently(state.maxHoldAlarms[pair], 6 * 60 * 60_000)) continue;
    state.maxHoldAlarms[pair] = new Date().toISOString();
    const hours = (overdue / 3600_000).toFixed(1);
    await sendTelegramMessage(
      `🚨 <b>Kraken posición stuck</b>: ${pair} ${meta.strategy} — max hold +${hours}h sin cierre`,
    ).catch(() => undefined);
  }
  saveAlarmState(state);
}

/** Combined tick for exit/analysis loops. */
export async function runCryptoEngineAlarms(): Promise<void> {
  await checkCryptoHeartbeatAlarm().catch(() => undefined);
  await checkCryptoMaxHoldAlarms().catch(() => undefined);
}
