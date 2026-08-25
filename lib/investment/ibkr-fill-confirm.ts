/**
 * Wait until IBKR confirms Filled before SQLite / hourly registration.
 * Polls GET /api/ibkr/orders; cancels if still Submitted after 5 min.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";

export type IbkrOrderRow = {
  orderId?: number | string;
  symbol?: string;
  status?: string;
  action?: string;
  quantity?: number;
  filled?: number;
  remaining?: number;
  avgFillPrice?: number;
};

export type FillConfirmResult =
  | { outcome: "filled"; status: string; avgFillPrice?: number }
  | { outcome: "rejected"; status: string }
  | { outcome: "cancelled"; status: string }
  | { outcome: "timeout_cancelled"; status: string }
  | { outcome: "unknown"; status: string };

const TERMINAL_REJECT = new Set([
  "CANCELLED",
  "APICANCELLED",
  "INACTIVE",
  "REJECTED",
]);

const PENDING = new Set(["PRESUBMITTED", "SUBMITTED", "PENDINGSUBMIT"]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normStatus(s: string | undefined): string {
  return String(s ?? "").trim().toUpperCase();
}

function matchOrder(rows: IbkrOrderRow[], ibkrOrderId: string): IbkrOrderRow | null {
  const id = String(ibkrOrderId).trim();
  for (const row of rows) {
    if (String(row.orderId ?? "").trim() === id) return row;
  }
  return null;
}

async function fetchOpenOrders(): Promise<IbkrOrderRow[]> {
  try {
    const rows = await ibkrServiceFetch<IbkrOrderRow[]>("/api/ibkr/orders");
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.warn(
      "[FillConfirm] GET /api/ibkr/orders failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

async function positionQty(symbol: string): Promise<number> {
  try {
    const rows = await ibkrServiceFetch<
      Array<{ symbol?: string; position?: number }>
    >("/api/ibkr/positions");
    const sym = symbol.trim().toUpperCase();
    let qty = 0;
    for (const r of rows ?? []) {
      if (String(r.symbol ?? "").trim().toUpperCase() === sym) {
        qty += Math.abs(Number(r.position ?? 0));
      }
    }
    return qty;
  } catch {
    return -1;
  }
}

/** When order leaves the open book, confirm via position for BUY/SELL. */
async function confirmAbsentAsFilled(
  symbol: string,
  side: "BUY" | "SELL",
): Promise<FillConfirmResult> {
  const qty = await positionQty(symbol);
  if (side === "BUY") {
    if (qty > 0) {
      return { outcome: "filled", status: "FILLED_ABSENT" };
    }
    if (qty === 0) {
      console.warn(
        `[FillConfirm] ${symbol} BUY ausente en openOrders y qty=0 → rejected/no fill`,
      );
      return { outcome: "rejected", status: "ABSENT_NO_POSITION" };
    }
  } else {
    if (qty === 0) {
      return { outcome: "filled", status: "FILLED_ABSENT" };
    }
    if (qty > 0) {
      // Still holding — may be partial or cancel; treat as not filled
      console.warn(
        `[FillConfirm] ${symbol} SELL ausente en openOrders pero qty=${qty} → unknown`,
      );
      return { outcome: "unknown", status: "ABSENT_STILL_HELD" };
    }
  }
  // qty === -1 (fetch failed) — optimistic fill so we don't lose confirmed absences
  return { outcome: "filled", status: "FILLED_ABSENT" };
}

async function cancelOrder(ibkrOrderId: string): Promise<void> {
  const id = Number(ibkrOrderId);
  if (!Number.isFinite(id) || id <= 0) return;
  try {
    await ibkrServiceFetch(`/api/orders/${id}`, { method: "DELETE" });
    console.log(`[FillConfirm] cancelada orden ibkrId=${id}`);
  } catch (err) {
    console.warn(
      `[FillConfirm] cancel falló ibkrId=${id}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * After submit: wait for Filled.
 * - Poll every 5s starting after initialWaitMs (default 30s)
 * - If still pending at 5 min → cancel, do not register
 * - If order disappears from open book → treat as filled (IBKR removes filled from openOrders)
 */
export async function waitForIbkrFill(params: {
  ibkrOrderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  initialWaitMs?: number;
  maxWaitMs?: number;
  pollMs?: number;
}): Promise<FillConfirmResult> {
  const ibkrId = String(params.ibkrOrderId ?? "").trim();
  if (!ibkrId || ibkrId.toUpperCase().startsWith("PAPER_")) {
    return { outcome: "unknown", status: "NO_IBKR_ID" };
  }

  const initialWaitMs = params.initialWaitMs ?? 30_000;
  const maxWaitMs = params.maxWaitMs ?? 5 * 60_000;
  const pollMs = params.pollMs ?? 5_000;
  const started = Date.now();

  console.log(
    `[FillConfirm] ${params.symbol} ${params.side} ibkrId=${ibkrId} — espera ${initialWaitMs / 1000}s…`,
  );
  await sleep(initialWaitMs);

  while (Date.now() - started < maxWaitMs) {
    const rows = await fetchOpenOrders();
    const row = matchOrder(rows, ibkrId);
    if (row) {
      const st = normStatus(row.status);
      console.log(`[FillConfirm] ${params.symbol} ibkrId=${ibkrId} status=${st}`);
      if (st === "FILLED") {
        return {
          outcome: "filled",
          status: st,
          avgFillPrice: Number(row.avgFillPrice) || undefined,
        };
      }
      if (TERMINAL_REJECT.has(st)) {
        return {
          outcome: st.includes("CANCEL") ? "cancelled" : "rejected",
          status: st,
        };
      }
      if (PENDING.has(st) || st === "") {
        await sleep(pollMs);
        continue;
      }
      // Unknown non-pending status — keep polling briefly
      await sleep(pollMs);
      continue;
    }

    // Not in open orders → confirm via position snapshot
    return confirmAbsentAsFilled(params.symbol, params.side);
  }

  // Still pending after 5 min → cancel
  const finalRows = await fetchOpenOrders();
  const still = matchOrder(finalRows, ibkrId);
  const st = normStatus(still?.status);
  if (still && PENDING.has(st)) {
    console.warn(
      `[FillConfirm] ${params.symbol} ibkrId=${ibkrId} aún ${st} tras 5 min → cancelando`,
    );
    await cancelOrder(ibkrId);
    return { outcome: "timeout_cancelled", status: st };
  }
  if (!still) {
    return confirmAbsentAsFilled(params.symbol, params.side);
  }
  if (TERMINAL_REJECT.has(st)) {
    return { outcome: st.includes("CANCEL") ? "cancelled" : "rejected", status: st };
  }
  if (st === "FILLED") {
    return { outcome: "filled", status: st, avgFillPrice: Number(still.avgFillPrice) || undefined };
  }

  console.warn(`[FillConfirm] ${params.symbol} ibkrId=${ibkrId} outcome unknown status=${st}`);
  return { outcome: "unknown", status: st || "UNKNOWN" };
}
