/**
 * Daily IBKR crypto permission probe — whatIf BTC order (no transmit).
 * At 10:00 Madrid: if error 460 is gone, Telegram that CRYPTO_BROKER=ibkr is ready.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { CRYPTO_IBKR_ACCOUNT_DEFAULT } from "@/lib/trading/crypto/config";

const STATE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const STATE_FILE = path.join(STATE_DIR, "crypto-permission-probe.json");

type ProbeAccountResult = {
  account: string;
  ok: boolean;
  code: number | null;
  message: string;
  permissionGranted: boolean;
};

type ProbeState = {
  lastProbeDay: string;
  lastAlertDay: string;
  results: ProbeAccountResult[];
};

function madridDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function madridHM(now = new Date()): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  return {
    h: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    m: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

function loadState(): ProbeState {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return { lastProbeDay: "", lastAlertDay: "", results: [] };
    }
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as ProbeState;
  } catch {
    return { lastProbeDay: "", lastAlertDay: "", results: [] };
  }
}

function saveState(state: ProbeState): void {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.warn("[CryptoPermission] save failed:", err instanceof Error ? err.message : err);
  }
}

function configuredAccounts(): string[] {
  const raw =
    process.env.IBKR_ACCOUNT_IDS?.trim() ||
    process.env.IBKR_ACCOUNT_ID?.trim() ||
    CRYPTO_IBKR_ACCOUNT_DEFAULT;
  const ids = raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(ids.length ? ids : [CRYPTO_IBKR_ACCOUNT_DEFAULT])];
}

function parseReject(err: unknown): { code: number | null; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const payload =
    err && typeof err === "object" && "payload" in err
      ? (err as { payload?: Record<string, unknown> }).payload
      : undefined;
  const codeRaw =
    payload?.ibkrRejectCode ??
    payload?.code ??
    (() => {
      const m = msg.match(/\b(460|201|202|203|10147)\b/);
      return m ? Number(m[1]) : null;
    })();
  const code = typeof codeRaw === "number" && Number.isFinite(codeRaw) ? codeRaw : null;
  const detail =
    (typeof payload?.ibkrRejectMessage === "string" && payload.ibkrRejectMessage) ||
    (typeof payload?.reject_reason === "string" && payload.reject_reason) ||
    msg;
  return { code, message: String(detail) };
}

/** Probe one account with BTC CRYPTO whatIf (no transmit). */
export async function probeCryptoPermissionForAccount(account: string): Promise<ProbeAccountResult> {
  try {
    const result = await ibkrServiceFetch<{
      allowed?: boolean;
      permissionGranted?: boolean;
      code?: number | null;
      message?: string;
      account?: string;
      ibkrStatus?: string;
    }>("/api/ibkr/crypto/permission-probe", {
      method: "POST",
      body: JSON.stringify({
        account,
        symbol: "BTC",
        quantity: 0.001,
        limit_price: 1,
      }),
    });
    const code = result.code ?? null;
    const message = result.message ?? result.ibkrStatus ?? "ok";
    const permissionGranted =
      result.permissionGranted === true ||
      result.allowed === true ||
      (code !== 460 && !/no trading permissions/i.test(message));
    return {
      account,
      ok: true,
      code,
      message,
      permissionGranted,
    };
  } catch (err) {
    const { code, message } = parseReject(err);
    const permissionGranted = code !== 460 && !/no trading permissions/i.test(message);
    return {
      account,
      ok: false,
      code,
      message,
      permissionGranted,
    };
  }
}

export async function runCryptoPermissionProbe(opts?: {
  force?: boolean;
}): Promise<{ probed: boolean; results: ProbeAccountResult[]; alerted: string[] }> {
  const day = madridDayKey();
  const state = loadState();
  if (!opts?.force && state.lastProbeDay === day) {
    return { probed: false, results: state.results, alerted: [] };
  }

  const accounts = configuredAccounts();
  const results: ProbeAccountResult[] = [];
  for (const account of accounts) {
    const row = await probeCryptoPermissionForAccount(account);
    results.push(row);
    console.log(
      `[CryptoPermission] account=${account} code=${row.code ?? "n/a"} ` +
        `granted=${row.permissionGranted} msg=${row.message.slice(0, 120)}`,
    );
  }

  const alerted: string[] = [];
  const alreadyAlerted = state.lastAlertDay === day;
  if (!alreadyAlerted) {
    for (const row of results) {
      if (!row.permissionGranted) continue;
      const line = `✅ Permiso crypto aprobado en ${row.account} — listo para CRYPTO_BROKER=ibkr`;
      await sendTelegramMessage(line).catch((err) =>
        console.warn("[CryptoPermission] Telegram:", err instanceof Error ? err.message : err),
      );
      alerted.push(row.account);
    }
  }

  saveState({
    lastProbeDay: day,
    lastAlertDay: alerted.length ? day : state.lastAlertDay,
    results,
  });

  return { probed: true, results, alerted };
}

let probeTimer: ReturnType<typeof setInterval> | null = null;

/** Fire once near 10:00 Europe/Madrid every day. */
export function startCryptoPermissionProbeScheduler(): void {
  if (probeTimer) return;
  const tick = () => {
    const { h, m } = madridHM();
    // 10:00–10:04 window
    if (h === 10 && m < 5) {
      void runCryptoPermissionProbe().catch((err) =>
        console.warn("[CryptoPermission] probe failed:", err instanceof Error ? err.message : err),
      );
    }
  };
  tick();
  probeTimer = setInterval(tick, 60_000);
  if (typeof probeTimer === "object" && "unref" in probeTimer) {
    probeTimer.unref?.();
  }
}
