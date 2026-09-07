/**
 * Resolve LMT price from a live IBKR quote.
 * Stocks: last/current, else mid (bid+ask)/2.
 * FOREX: BUY=ask, SELL=bid, else mid.
 */

export type LiveLimitQuote = {
  readonly bid: number | null;
  readonly ask: number | null;
  readonly last: number | null;
  readonly mid: number | null;
};

export type LiveLimitAsset = "STK" | "FOREX";

function positive(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

export function midFromBidAsk(bid: number | null, ask: number | null): number | null {
  const b = positive(bid);
  const a = positive(ask);
  if (b != null && a != null) return (b + a) / 2;
  return null;
}

/** Current stock price: last, else mid, else either side of the book. */
export function stockCurrentPrice(quote: LiveLimitQuote): number | null {
  return (
    positive(quote.last) ??
    positive(quote.mid) ??
    midFromBidAsk(quote.bid, quote.ask) ??
    positive(quote.bid) ??
    positive(quote.ask)
  );
}

export function resolveLimitPriceFromQuote(args: {
  readonly asset: LiveLimitAsset;
  readonly side: "BUY" | "SELL";
  readonly quote: LiveLimitQuote;
  readonly suggested?: number | null;
}): number | null {
  if (args.asset === "FOREX") {
    const sidePx = args.side === "BUY" ? positive(args.quote.ask) : positive(args.quote.bid);
    return (
      sidePx ??
      positive(args.quote.mid) ??
      midFromBidAsk(args.quote.bid, args.quote.ask) ??
      positive(args.quote.last)
    );
  }

  const suggested = positive(args.suggested);
  const current = stockCurrentPrice(args.quote);
  return current ?? suggested;
}
