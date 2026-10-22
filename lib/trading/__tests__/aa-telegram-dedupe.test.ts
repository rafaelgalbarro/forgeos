import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetTelegramDedupeForTests,
  shouldSkipDuplicateTelegram,
} from "@/lib/notifications/telegram-dedupe";

describe("Telegram anti-spam", () => {
  beforeEach(() => __resetTelegramDedupeForTests());

  it("skips the same alert (numbers ignored) inside 60 min", () => {
    const t0 = 1_000_000;
    expect(shouldSkipDuplicateTelegram("⚠️ EODHD WS QC SNOW: sin datos 12m", t0)).toBe(false);
    expect(shouldSkipDuplicateTelegram("⚠️ EODHD WS QC SNOW: sin datos 15m", t0 + 60_000)).toBe(true);
    expect(shouldSkipDuplicateTelegram("⚠️ EODHD WS QC SNOW: sin datos 9m", t0 + 61 * 60_000)).toBe(false);
  });

  it("never skips executions / stops", () => {
    const t0 = 1_000_000;
    const msg = "🟢 SHORT Futures PF_ZROUSD 6 @ $1.86";
    expect(shouldSkipDuplicateTelegram(msg, t0)).toBe(false);
    expect(shouldSkipDuplicateTelegram(msg, t0 + 1000)).toBe(false);
  });
});
