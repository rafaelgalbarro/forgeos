import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notifications/telegram-bot", () => ({
  sendTelegramMessage: vi.fn(async () => undefined),
}));

describe("crypto journal write (FORGEOS_ROOT)", () => {
  let tmp: string;
  let prevRoot: string | undefined;
  let prevCwd: string;

  beforeEach(() => {
    prevCwd = process.cwd();
    prevRoot = process.env.FORGEOS_ROOT;
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-jnl-"));
    process.env.FORGEOS_ROOT = tmp;
    process.chdir(tmp);
    vi.resetModules();
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevRoot === undefined) delete process.env.FORGEOS_ROOT;
    else process.env.FORGEOS_ROOT = prevRoot;
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("opens and closes a simulated trade on disk", async () => {
    const {
      appendCryptoJournal,
      closeCryptoJournalOpen,
      cryptoJournalPath,
      listOpenCryptoJournal,
      readCryptoJournal,
    } = await import("@/lib/trading/crypto/journal-crypto");

    appendCryptoJournal({
      at: new Date().toISOString(),
      strategy: "TREND_PULLBACK_1H",
      pair: "ETHEUR",
      regime: "ALCISTA",
      side: "BUY",
      entry: 2000,
      exit: null,
      exitReason: null,
      grossPnlEur: null,
      feesEur: 0.5,
      netPnlEur: null,
      durationMs: null,
      mfePct: null,
      maePct: null,
      shadow: false,
      open: true,
      signalKey: "TREND_PULLBACK_1H|ETHEUR|test1",
      stopLoss: 1960,
      takeProfit: 2080,
      qty: 0.01,
    });

    expect(fs.existsSync(cryptoJournalPath())).toBe(true);
    const opens = listOpenCryptoJournal({ shadow: false, pair: "ETHEUR" });
    expect(opens.length).toBe(1);

    closeCryptoJournalOpen({
      open: opens[0]!,
      exit: 2040,
      exitReason: "TAKE_PROFIT",
      feesEur: 0.8,
      mfePct: 0.02,
      maePct: -0.005,
    });

    const all = readCryptoJournal();
    expect(all.some((t) => t.side === "SELL" && t.exit === 2040)).toBe(true);
    expect(listOpenCryptoJournal({ shadow: false, pair: "ETHEUR" }).length).toBe(
      0,
    );
  });
});
