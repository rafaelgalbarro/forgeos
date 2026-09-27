/**
 * Atomic crypto slot + cash reservation (in-memory mutex).
 * Prevents concurrent cycle workers from exceeding CRYPTO_LIVE_MAX_POSITIONS
 * or double-spending EUR cash on in-flight buys.
 */

import "server-only";

import { isJournalOpenCryptoPosition, journalOpenCryptoSymbols } from "@/lib/trading/forgeos-owned";
import { cryptoLiveMaxPositions } from "@/lib/trading/crypto/config";

export type CryptoReserveFailReason = "positions" | "cash";

export type CryptoReserveResult =
  | { ok: true; notionalEur: number }
  | { ok: false; reason: CryptoReserveFailReason; message: string };

type InflightBuy = {
  symbol: string;
  notionalEur: number;
};

function norm(symbol: string): string {
  return symbol.trim().toUpperCase().replace("/", "");
}

class CryptoSlotReservation {
  private chain: Promise<unknown> = Promise.resolve();
  /** Buys submitted or about to submit — count toward max positions + cash. */
  private inflight = new Map<string, InflightBuy>();
  /** Successfully filled this process lifetime (until releaseAll / cycle reset). */
  private filledThisCycle = new Set<string>();
  /** EUR cash snapshot at cycle start (Kraken). */
  private cashEurAvailable = 0;

  /** Serialize critical section. */
  private async exclusive<T>(fn: () => T | Promise<T>): Promise<T> {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prev = this.chain;
    this.chain = prev.then(() => gate).catch(() => gate);
    await prev.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /** Call at start of a crypto cycle (Kraken). */
  beginCycle(cashEur: number): void {
    this.inflight.clear();
    this.filledThisCycle.clear();
    this.cashEurAvailable = Math.max(0, cashEur);
  }

  /** ForgeOS open crypto positions (journal) + in-flight + filled this cycle. */
  private openCountLocked(): number {
    const journal = journalOpenCryptoSymbols();
    const symbols = new Set<string>();
    for (const s of journal) symbols.add(norm(s));
    for (const s of this.filledThisCycle) symbols.add(norm(s));
    for (const s of this.inflight.keys()) symbols.add(norm(s));
    return symbols.size;
  }

  private reservedCashLocked(): number {
    let sum = 0;
    for (const row of this.inflight.values()) sum += row.notionalEur;
    return sum;
  }

  /**
   * Atomically reserve one position slot + notional EUR.
   * Must call release() on failure or commit() on success.
   */
  async tryReserve(args: {
    symbol: string;
    notionalEur: number;
    maxPositions?: number;
  }): Promise<CryptoReserveResult> {
    const symbol = norm(args.symbol);
    const notional = Math.max(0, args.notionalEur);
    const maxPos = args.maxPositions ?? cryptoLiveMaxPositions();

    return this.exclusive(() => {
      if (this.inflight.has(symbol) || this.filledThisCycle.has(symbol)) {
        return {
          ok: false as const,
          reason: "positions" as const,
          message: `límite de posiciones (${symbol} ya reservado)`,
        };
      }

      // Journal already open for this symbol → treat as existing position (no new buy)
      if (isJournalOpenCryptoPosition(symbol)) {
        return {
          ok: false as const,
          reason: "positions" as const,
          message: `límite de posiciones (${symbol} ya abierta ForgeOS)`,
        };
      }

      const open = this.openCountLocked();
      if (open >= maxPos) {
        return {
          ok: false as const,
          reason: "positions" as const,
          message: `límite de posiciones (${open}/${maxPos})`,
        };
      }

      const freeCash = this.cashEurAvailable - this.reservedCashLocked();
      if (!(notional > 0) || freeCash + 1e-9 < notional) {
        return {
          ok: false as const,
          reason: "cash" as const,
          message: `sin saldo EUR (libre €${Math.max(0, freeCash).toFixed(2)}, hace falta €${notional.toFixed(2)})`,
        };
      }

      this.inflight.set(symbol, { symbol, notionalEur: notional });
      return { ok: true as const, notionalEur: notional };
    });
  }

  /** Order failed / aborted — free slot + cash. */
  async release(symbol: string): Promise<void> {
    const key = norm(symbol);
    await this.exclusive(() => {
      this.inflight.delete(key);
    });
  }

  /** Order succeeded — keep counting as open (journal will catch up). */
  async commit(symbol: string): Promise<void> {
    const key = norm(symbol);
    await this.exclusive(() => {
      const row = this.inflight.get(key);
      if (row) {
        this.cashEurAvailable = Math.max(0, this.cashEurAvailable - row.notionalEur);
        this.inflight.delete(key);
      }
      this.filledThisCycle.add(key);
    });
  }

  snapshot(): { open: number; inflight: number; cashFree: number } {
    const reserved = this.reservedCashLocked();
    return {
      open: this.openCountLocked(),
      inflight: this.inflight.size,
      cashFree: Math.max(0, this.cashEurAvailable - reserved),
    };
  }
}

const globalReservation = new CryptoSlotReservation();

export function getCryptoSlotReservation(): CryptoSlotReservation {
  return globalReservation;
}

export function beginCryptoCycleReservation(cashEur: number): void {
  globalReservation.beginCycle(cashEur);
}
