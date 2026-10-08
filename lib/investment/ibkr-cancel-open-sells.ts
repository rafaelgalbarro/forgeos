/**
 * Cancel existing open IBKR SELL orders for a symbol before placing a new exit.
 */

import "server-only";

import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { cancelIbkrOrder } from "@/lib/investment/ibkr-supervised-submit";

type IbkrOpenOrderRow = {
  orderId?: string | number;
  order_id?: string | number;
  id?: string | number;
  symbol?: string;
  side?: string;
  action?: string;
  status?: string;
};

function orderIdOf(row: IbkrOpenOrderRow): string | null {
  const raw = row.orderId ?? row.order_id ?? row.id;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s || null;
}

function isSellSide(row: IbkrOpenOrderRow): boolean {
  const s = String(row.side ?? row.action ?? "").toUpperCase();
  return s === "SELL" || s === "SSHORT" || s === "SELLSHORT";
}

function isOpenStatus(status: string): boolean {
  const s = status.toUpperCase();
  return (
    s === "SUBMITTED" ||
    s === "PRESUBMITTED" ||
    s === "PENDINGSUBMIT" ||
    s === "PENDINGCANCEL" ||
    s === "APICENDING" ||
    s === "INACTIVE" ||
    s === "" ||
    s.includes("SUBMIT")
  );
}

/**
 * Ensure at most one live SELL for `symbol`: cancel prior open sells first.
 * Returns count cancelled.
 */
export async function cancelOpenIbkrSellsForSymbol(symbol: string): Promise<number> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return 0;
  let rows: IbkrOpenOrderRow[] = [];
  try {
    rows = await ibkrServiceFetch<IbkrOpenOrderRow[]>("/api/ibkr/orders");
  } catch (err) {
    console.warn(
      `[IBKR/Sell] no se pudo listar open orders para ${sym}:`,
      err instanceof Error ? err.message : err,
    );
    return 0;
  }
  if (!Array.isArray(rows)) return 0;

  let cancelled = 0;
  for (const row of rows) {
    const rowSym = String(row.symbol ?? "").trim().toUpperCase();
    if (rowSym !== sym) continue;
    if (!isSellSide(row)) continue;
    if (!isOpenStatus(String(row.status ?? ""))) continue;
    const id = orderIdOf(row);
    if (!id) continue;
    try {
      await cancelIbkrOrder(id);
      cancelled += 1;
      console.log(`[IBKR/Sell] cancelada SELL previa ${sym} orderId=${id}`);
    } catch (err) {
      console.warn(
        `[IBKR/Sell] cancel ${sym} #${id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  return cancelled;
}
