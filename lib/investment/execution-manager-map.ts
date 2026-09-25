/**
 * Pure order-row mapping for Execution Manager (client + server safe).
 */

import { createHash } from "crypto";
import { maskAccountId } from "@/lib/ibkr/account-mask";
import {
  normalizeOrderStatus,
  type ExecutionManagerState,
  type NormalizedOrderStatus,
} from "@/lib/investment/execution-manager-status";

export type RawBrokerOrder = {
  orderId?: number | string;
  permId?: number | null;
  account?: string | null;
  symbol?: string;
  action?: string;
  orderType?: string;
  quantity?: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  takeProfit?: number | null;
  trailStopPrice?: number | null;
  trailingPercent?: number | null;
  tif?: string | null;
  status?: string;
  filled?: number | null;
  remaining?: number | null;
  avgFillPrice?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  responsable?: string | null;
  origen?: string | null;
};

export type ExecutionManagerOrderRow = {
  readonly uuid: string;
  readonly orderId: string;
  readonly brokerId: string;
  readonly estado: ExecutionManagerState;
  readonly estadoLabel: string;
  readonly rawStatus: string;
  readonly statusMapped: boolean;
  readonly activo: string;
  readonly cuenta: string;
  readonly cuentaMasked: string;
  readonly precio: number | null;
  readonly cantidad: number;
  readonly tipo: string;
  readonly side: string;
  readonly stop: number | null;
  readonly takeProfit: number | null;
  readonly trailing: number | null;
  readonly fecha: string | null;
  readonly updatedAt: string | null;
  readonly responsable: string;
  readonly origen: string;
  readonly filled: number | null;
  readonly remaining: number | null;
  readonly avgFillPrice: number | null;
  readonly tif: string | null;
};

function stableUuid(seed: string): string {
  const hex = createHash("sha1").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function asFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapBrokerOrderToRow(raw: RawBrokerOrder): ExecutionManagerOrderRow {
  const orderId = raw.orderId != null ? String(raw.orderId) : "NO_DATA";
  const symbol = (raw.symbol ?? "NO_DATA").toUpperCase();
  const permId = raw.permId != null ? String(raw.permId) : null;
  const qty = asFinite(raw.quantity) ?? 0;
  const filled = asFinite(raw.filled);
  const remaining = asFinite(raw.remaining);
  const normalized: NormalizedOrderStatus = normalizeOrderStatus(raw.status, {
    filled,
    remaining,
    quantity: qty,
  });
  const account = raw.account ?? null;
  const uuid = stableUuid(`ibkr:${orderId}:${permId ?? "noperm"}:${symbol}:${raw.status ?? ""}`);

  return {
    uuid,
    orderId,
    brokerId: permId ?? "IBKR",
    estado: normalized.state,
    estadoLabel: normalized.label,
    rawStatus: normalized.raw,
    statusMapped: normalized.mapped,
    activo: symbol,
    cuenta: account ?? "NO_DATA",
    cuentaMasked: maskAccountId(account),
    precio: asFinite(raw.limitPrice),
    cantidad: qty,
    tipo: raw.orderType ?? "NO_DATA",
    side: raw.action ?? "NO_DATA",
    stop: asFinite(raw.stopPrice),
    takeProfit: asFinite(raw.takeProfit),
    trailing: asFinite(raw.trailStopPrice) ?? asFinite(raw.trailingPercent),
    fecha: raw.createdAt ?? raw.updatedAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    responsable: raw.responsable?.trim() || "IBKR/TWS",
    origen: raw.origen?.trim() || "IBKR_OPEN_ORDERS",
    filled,
    remaining,
    avgFillPrice: asFinite(raw.avgFillPrice),
    tif: raw.tif ?? null,
  };
}
