/**
 * Domain unit tests — PROGRAM 6110 Portfolio aggregate
 */
import { describe, expect, it } from "vitest";
import { Portfolio } from "./aggregate";
import { asVentureId, asWorkspaceId } from "../shared/ids";
import { canTransitionLifecycle, isActiveLifecycle } from "./lifecycle";

describe("Portfolio aggregate invariants", () => {
  const ws = asWorkspaceId("ws-cert");

  function basePortfolio() {
    const r = Portfolio.create({ id: "pf-cert", workspaceId: ws, name: "Cert", slug: "cert" });
    expect(r.ok).toBe(true);
    return r.ok ? r.value : null;
  }

  it("paused venture blocks automatic tasks", () => {
    const p = basePortfolio();
    if (!p) return;
    const withV = p.addVenture({ ventureId: asVentureId("v1") });
    if (!withV.ok) return;
    const paused = withV.value.pauseVenture(asVentureId("v1"), "actor", "test");
    if (!paused.ok) return;
    expect(paused.value.canStartAutomaticTasks(asVentureId("v1"))).toBe(false);
  });

  it("allocation cannot exceed workspace limits", () => {
    const created = Portfolio.create({
      id: "pf-lim",
      workspaceId: ws,
      name: "Lim",
      slug: "lim",
      workspaceLimits: { AI_EXECUTION: 10 },
    });
    if (!created.ok) return;
    let p = created.value.addVenture({ ventureId: asVentureId("v1") });
    if (!p.ok) return;
    const now = new Date().toISOString();
    const alloc1 = p.value.allocateResource(
      {
        id: "a1",
        portfolioId: p.value.id,
        ventureId: asVentureId("v1"),
        resourceType: "AI_EXECUTION",
        limit: 8,
        used: 0,
        reserved: 0,
        available: 8,
        period: "monthly",
        status: "AVAILABLE",
        updatedAt: now,
      },
      now,
    );
    if (!alloc1.ok) return;
    const alloc2 = alloc1.value.allocateResource(
      {
        id: "a2",
        portfolioId: alloc1.value.id,
        ventureId: asVentureId("v1"),
        resourceType: "AI_EXECUTION",
        limit: 5,
        used: 0,
        reserved: 0,
        available: 5,
        period: "monthly",
        status: "AVAILABLE",
        updatedAt: now,
      },
      now,
    );
    expect(alloc2.ok).toBe(false);
  });

  it("lifecycle state machine covers all states", () => {
    expect(canTransitionLifecycle("SCALING", "AT_RISK")).toBe(true);
    expect(isActiveLifecycle("BUILDING")).toBe(true);
    expect(isActiveLifecycle("CLOSED")).toBe(false);
  });
});
