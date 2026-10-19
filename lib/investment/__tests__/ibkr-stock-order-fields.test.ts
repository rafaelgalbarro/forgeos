import { afterEach, describe, expect, it } from "vitest";
import { buildIbkrStockProposalOrderFields } from "@/lib/investment/ibkr-stock-order-fields";
import { resolvePositionSize } from "@/src/core/trading/trading-engine";

describe("buildIbkrStockProposalOrderFields", () => {
  const prev = process.env.IBKR_FRACTIONAL_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.IBKR_FRACTIONAL_ENABLED;
    else process.env.IBKR_FRACTIONAL_ENABLED = prev;
  });

  it("$143 cash @ $200 with fractional → qty < 1 and cash_qty_usd >= 25", () => {
    process.env.IBKR_FRACTIONAL_ENABLED = "true";
    const sized = resolvePositionSize(
      { cashUSD: 143, availableFunds: 143, navUSD: 143 },
      200,
      0.75,
      { stopLossPrice: 200 * 0.98 },
    );
    expect(sized.fractional).toBe(true);
    expect(sized.qty).toBeLessThan(1);

    const fields = buildIbkrStockProposalOrderFields({
      side: "BUY",
      quantity: sized.qty,
      limitPrice: 200,
      currency: "USD",
      fractional: sized.fractional,
      cashQtyUsd: sized.deployable,
    });
    expect(fields.fractional).toBe(true);
    expect(fields.quantity).toBeLessThan(1);
    expect(fields.cash_qty_usd).toBeGreaterThanOrEqual(25);
    expect(fields.cash_qty_usd).toBeLessThanOrEqual(143 * 0.95);
  });

  it("EUR listing stays whole shares", () => {
    const fields = buildIbkrStockProposalOrderFields({
      side: "BUY",
      quantity: 1.5,
      limitPrice: 10,
      currency: "EUR",
      fractional: true,
    });
    expect(fields.quantity).toBe(1);
    expect(fields.fractional).toBeUndefined();
    expect(fields.cash_qty_usd).toBeUndefined();
  });
});
