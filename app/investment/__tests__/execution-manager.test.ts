import { describe, expect, it } from "vitest";
import {
  gateExecutionMutation,
  isMutationLocked,
  resolveExecutionSafetyFlags,
} from "@/lib/investment/execution-manager-actions";
import {
  canAttemptCancel,
  canAttemptModify,
  normalizeOrderStatus,
} from "@/lib/investment/execution-manager-status";
import { mapBrokerOrderToRow } from "@/lib/investment/execution-manager-map";

describe("execution-manager status mapping", () => {
  it("maps IBKR/TWS statuses to Execution Manager estados", () => {
    expect(normalizeOrderStatus("PreSubmitted").state).toBe("Submitted");
    expect(normalizeOrderStatus("Submitted").state).toBe("Working");
    expect(normalizeOrderStatus("PendingSubmit").state).toBe("Pending");
    expect(normalizeOrderStatus("Filled").state).toBe("Filled");
    expect(normalizeOrderStatus("Cancelled").state).toBe("Cancelled");
    expect(normalizeOrderStatus("Canceled").state).toBe("Cancelled");
    expect(normalizeOrderStatus("Inactive").state).toBe("Rejected");
    expect(normalizeOrderStatus("Expired").state).toBe("Expired");
    expect(normalizeOrderStatus("PARTIALLY_FILLED").state).toBe("Partially Filled");
  });

  it("shows raw + normalized for unmapped statuses", () => {
    const result = normalizeOrderStatus("WeirdBrokerState");
    expect(result.mapped).toBe(false);
    expect(result.label).toContain("WeirdBrokerState");
    expect(result.raw).toBe("WeirdBrokerState");
  });

  it("prefers fill hints when Submitted is partially filled", () => {
    const result = normalizeOrderStatus("Submitted", { filled: 2, remaining: 3, quantity: 5 });
    expect(result.state).toBe("Partially Filled");
  });

  it("gates cancel/modify by terminal state", () => {
    expect(canAttemptCancel("Filled")).toBe(false);
    expect(canAttemptCancel("Working")).toBe(true);
    expect(canAttemptModify("Draft")).toBe(false);
    expect(canAttemptModify("Working")).toBe(true);
  });
});

describe("execution-manager mutation gate", () => {
  it("defaults to ANALYSIS_ONLY LOCKED when live trading disabled", () => {
    const flags = resolveExecutionSafetyFlags({
      LIVE_TRADING_ENABLED: "false",
      IBKR_READ_ONLY: "true",
    });
    expect(flags.mode).toBe("ANALYSIS_ONLY");
    expect(isMutationLocked(flags)).toBe(true);

    const gate = gateExecutionMutation({
      action: "cancel",
      state: "Working",
      flags,
      orderId: 42,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.wouldMutateBroker).toBe(false);
    expect(gate.posture).toBe("LOCKED");
    expect(gate.message).toMatch(/LOCKED/);
    expect(gate.message).toMatch(/No broker mutation/);
  });

  it("still never allows broker mutation even if flags look open", () => {
    const flags = resolveExecutionSafetyFlags({
      LIVE_TRADING_ENABLED: "true",
      IBKR_READ_ONLY: "false",
    });
    // Live+writable flips autonomousLock, but ANALYSIS_ONLY mode still locks.
    expect(flags.mode).toBe("ANALYSIS_ONLY");
    expect(isMutationLocked(flags)).toBe(true);

    const gate = gateExecutionMutation({
      action: "modify",
      state: "Working",
      flags,
      orderId: 7,
    });
    expect(gate.allowed).toBe(false);
    expect(gate.wouldMutateBroker).toBe(false);
  });
});

describe("execution-manager order row mapping", () => {
  it("masks account and builds uuid / fields", () => {
    const row = mapBrokerOrderToRow({
      orderId: 1001,
      permId: 55,
      account: "DU1234567",
      symbol: "AAPL",
      action: "BUY",
      orderType: "LMT",
      quantity: 10,
      limitPrice: 190.5,
      stopPrice: 180,
      status: "Submitted",
      filled: 0,
      remaining: 10,
      createdAt: "2026-08-04T10:00:00.000Z",
    });
    expect(row.orderId).toBe("1001");
    expect(row.brokerId).toBe("55");
    expect(row.activo).toBe("AAPL");
    expect(row.cuentaMasked).toMatch(/\*{2,}/);
    expect(row.cuentaMasked).not.toBe("DU1234567");
    expect(row.estado).toBe("Working");
    expect(row.uuid).toMatch(/^[a-f0-9-]{36}$/i);
    expect(row.origen).toBe("IBKR_OPEN_ORDERS");
    expect(row.responsable).toBe("IBKR/TWS");
  });
});

describe("execution-manager API route", () => {
  it("exports GET/POST and dry-run action never mutates broker", async () => {
    const route = await import("../../api/investment/orders/route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");

    const { runExecutionManagerDryRunAction } = await import(
      "@/lib/investment/execution-manager-snapshot"
    );
    const body = runExecutionManagerDryRunAction({
      action: "cancel",
      state: "Working",
      orderId: 99,
    });
    expect(body.allowed).toBe(false);
    expect(body.wouldMutateBroker).toBe(false);
    expect(body.posture === "LOCKED" || body.posture === "DRY_RUN").toBe(true);
    expect(String(body.message)).toMatch(/No broker mutation|LOCKED|DRY_RUN/i);
  }, 30_000);

  it("exports Execution Manager page", async () => {
    const page = await import("../orders/page");
    expect(typeof page.default).toBe("function");
  }, 30_000);
});
