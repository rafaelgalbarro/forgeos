import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn(async () => 1);

vi.mock("@/lib/notifications/telegram-bot", () => ({
  sendTelegramMessage: (...args: unknown[]) => sendMock(...args),
}));

describe("sendSystemTelegramAlert", () => {
  beforeEach(async () => {
    sendMock.mockClear();
    const { __resetSystemTelegramAlertsForTests } = await import(
      "@/lib/notifications/telegram-policy"
    );
    __resetSystemTelegramAlertsForTests();
  });

  it("caps duplicate alert types to once per 30 minutes", async () => {
    const { sendSystemTelegramAlert } = await import("@/lib/notifications/telegram-policy");
    await sendSystemTelegramAlert("eodhd_ws_422", "first");
    await sendSystemTelegramAlert("eodhd_ws_422", "second");
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[0]).toBe("first");
  });
});
