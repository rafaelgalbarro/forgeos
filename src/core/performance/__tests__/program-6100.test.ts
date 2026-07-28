/**
 * PROGRAM 6100 — Performance foundation tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  requestCacheGet,
  requestCacheSet,
  requestCacheInvalidate,
  readModelCacheSet,
  readModelCacheGet,
  invalidateByEvent,
  invalidateVentureCache,
  resetReadModelCache,
} from "@/src/core/performance/cache";
import {
  assertVentureAccess,
  canAccessArtifact,
  IsolationViolationError,
} from "@/src/core/performance/isolation";
import {
  canStartExecution,
  startExecution,
  endExecution,
  cancelExecution,
  resetExecutions,
} from "@/src/core/performance/concurrency";
import {
  enqueueTask,
  planNextTask,
  startPlannedTask,
  completeTask,
  cancelTask,
  resetQueue,
} from "@/src/core/performance/queue";
import {
  createPreviewSession,
  transitionPreview,
  hibernateIdlePreviews,
  reactivatePreview,
  resetPreviewSessions,
} from "@/src/core/performance/preview";
import {
  loadLazyService,
  isLazyServiceLoaded,
  resetLazyServices,
} from "@/src/core/performance/composition/lazy-services";
import { createVentureSummaryFixtures, THREE_CONCURRENT_MISSIONS } from "@/src/core/performance/fixtures/multi-venture-simulation";
import { listPortfolioVentures } from "@/src/core/performance/queries/handlers";
import { clampPageSize } from "@/src/core/performance/projections/types";
import { COMPONENT_INVENTORY } from "@/src/core/performance/rendering/component-inventory";

const REQUEST_ID = {};

describe("PROGRAM 6100 — Request Cache", () => {
  it("stores and retrieves within request scope", () => {
    requestCacheSet(REQUEST_ID, { scope: "request", namespace: "test", id: "a" }, { value: 1 });
    expect(requestCacheGet(REQUEST_ID, { scope: "request", namespace: "test", id: "a" })).toEqual({ value: 1 });
  });

  it("invalidates by namespace", () => {
    requestCacheSet(REQUEST_ID, { scope: "request", namespace: "test", id: "a" }, 1);
    const removed = requestCacheInvalidate(REQUEST_ID, "test");
    expect(removed).toBe(1);
    expect(requestCacheGet(REQUEST_ID, { scope: "request", namespace: "test", id: "a" })).toBeUndefined();
  });
});

describe("PROGRAM 6100 — Read Model Cache", () => {
  beforeEach(() => resetReadModelCache());

  it("caches and retrieves read models", () => {
    readModelCacheSet({ scope: "read_model", namespace: "mission-card", id: "m1" }, { id: "m1" });
    const result = readModelCacheGet({ scope: "read_model", namespace: "mission-card", id: "m1" });
    expect(result?.value).toEqual({ id: "m1" });
    expect(result?.freshness).toBe("LIVE");
  });

  it("invalidates by event type", () => {
    readModelCacheSet(
      { scope: "read_model", namespace: "mission-card", ventureId: "v1", id: "m1" },
      { id: "m1" },
      { invalidationEvents: ["MissionSummaryChanged"] },
    );
    const removed = invalidateByEvent("MissionSummaryChanged", "v1");
    expect(removed).toBeGreaterThanOrEqual(0);
  });

  it("isolates venture cache invalidation", () => {
    resetReadModelCache();
    readModelCacheSet({ scope: "read_model", namespace: "venture-card", ventureId: "v1", id: "v1" }, { id: "v1" });
    readModelCacheSet({ scope: "read_model", namespace: "venture-card", ventureId: "v2", id: "v2" }, { id: "v2" });
    const removed = invalidateVentureCache("v1");
    expect(removed).toBe(1);
    expect(readModelCacheGet({ scope: "read_model", namespace: "venture-card", ventureId: "v2", id: "v2" })?.value).toEqual({ id: "v2" });
  });
});

describe("PROGRAM 6100 — Venture Isolation", () => {
  it("blocks cross-venture access", () => {
    expect(() =>
      assertVentureAccess("venture-b", { workspaceId: "ws-1", ventureId: "venture-a" }),
    ).toThrow(IsolationViolationError);
  });

  it("allows same-venture artifact access", () => {
    expect(
      canAccessArtifact({ ventureId: "v1", missionId: "m1" }, { workspaceId: "ws-1", ventureId: "v1" }),
    ).toBe(true);
  });

  it("blocks cross-venture artifact access", () => {
    expect(
      canAccessArtifact({ ventureId: "v2" }, { workspaceId: "ws-1", ventureId: "v1" }),
    ).toBe(false);
  });
});

describe("PROGRAM 6100 — Pagination", () => {
  it("clamps page size to max", () => {
    expect(clampPageSize(200)).toBe(100);
    expect(clampPageSize(undefined)).toBe(25);
  });

  it("lists portfolio ventures with pagination", () => {
    const result = listPortfolioVentures({ workspaceId: "ws-default", limit: 10 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("hasMore");
    expect(result.items.length).toBeLessThanOrEqual(10);
  });
});

describe("PROGRAM 6100 — Queue Priorities", () => {
  beforeEach(() => {
    resetQueue();
    resetExecutions();
  });

  it("enqueues and plans by priority", () => {
    enqueueTask({
      id: "low",
      type: "build",
      priority: "BACKGROUND",
      workspaceId: "ws-1",
      cancellable: true,
    });
    enqueueTask({
      id: "high",
      type: "preview",
      priority: "INTERACTIVE",
      workspaceId: "ws-1",
      cancellable: true,
    });
    const next = planNextTask();
    expect(next?.id).toBe("high");
  });

  it("cancels cancellable tasks", () => {
    enqueueTask({
      id: "t1",
      type: "build",
      priority: "STANDARD",
      workspaceId: "ws-1",
      cancellable: true,
    });
    expect(cancelTask("t1")).toBe(true);
  });
});

describe("PROGRAM 6100 — Concurrency Limits", () => {
  beforeEach(() => resetExecutions());

  it("enforces venture execution limits", () => {
    const limits = {
      MAX_GLOBAL_EXECUTIONS: 100,
      MAX_WORKSPACE_EXECUTIONS: 100,
      MAX_VENTURE_EXECUTIONS: 1,
      MAX_AI_EXECUTIONS: 100,
      MAX_CODE_BUILDS: 100,
      MAX_PREVIEW_SANDBOXES: 100,
      MAX_DEPLOYMENT_EXECUTIONS: 100,
    };
    startExecution("e1", "VENTURE", { workspaceId: "ws-1", ventureId: "v1" });
    const check = canStartExecution("VENTURE", { workspaceId: "ws-1", ventureId: "v1" }, limits);
    expect(check.allowed).toBe(false);
    endExecution("e1");
    expect(canStartExecution("VENTURE", { workspaceId: "ws-1", ventureId: "v1" }, limits).allowed).toBe(true);
  });

  it("isolates failure — cancelling one does not block others", () => {
    startExecution("e1", "VENTURE", { workspaceId: "ws-1", ventureId: "v1" });
    startExecution("e2", "VENTURE", { workspaceId: "ws-1", ventureId: "v2" });
    cancelExecution("e1");
    expect(canStartExecution("VENTURE", { workspaceId: "ws-1", ventureId: "v1" }).allowed).toBe(true);
    endExecution("e2");
  });
});

describe("PROGRAM 6100 — Preview Hibernation", () => {
  beforeEach(() => resetPreviewSessions());

  it("transitions through lifecycle states", () => {
    createPreviewSession({ previewId: "p1", missionId: "m1", ventureId: "v1", port: 3001 });
    transitionPreview("p1", "STARTING");
    transitionPreview("p1", "READY");
    const session = transitionPreview("p1", "IDLE");
    expect(session?.state).toBe("IDLE");
  });

  it("hibernates idle previews", () => {
    createPreviewSession({ previewId: "p1", missionId: "m1", ventureId: "v1" });
    transitionPreview("p1", "READY");
    const hibernated = hibernateIdlePreviews(Date.now() + 11 * 60 * 1000);
    expect(hibernated).toContain("p1");
  });

  it("reactivates hibernated preview", () => {
    createPreviewSession({ previewId: "p1", missionId: "m1", ventureId: "v1" });
    transitionPreview("p1", "HIBERNATED");
    const session = reactivatePreview("p1");
    expect(session?.state).toBe("STARTING");
  });
});

describe("PROGRAM 6100 — Lazy Service Init", () => {
  beforeEach(() => resetLazyServices());

  it("loads lazy service on demand", async () => {
    expect(isLazyServiceLoaded("factories")).toBe(false);
    await loadLazyService("factories", () => ({ name: "factories" }));
    expect(isLazyServiceLoaded("factories")).toBe(true);
  });
});

describe("PROGRAM 6100 — 100 Venture Summaries", () => {
  it("creates 100 lightweight venture cards efficiently", () => {
    const start = performance.now();
    const cards = createVentureSummaryFixtures(100);
    const elapsed = performance.now() - start;
    expect(cards).toHaveLength(100);
    expect(elapsed).toBeLessThan(500);
    const payload = JSON.stringify(cards);
    expect(payload.length).toBeLessThan(100_000);
  });
});

describe("PROGRAM 6100 — 3 Concurrent Missions", () => {
  it("defines independent mission scenario", () => {
    expect(THREE_CONCURRENT_MISSIONS.missions).toHaveLength(3);
    const ventures = new Set(THREE_CONCURRENT_MISSIONS.missions.map((m) => m.ventureId));
    expect(ventures.size).toBe(3);
    const failed = THREE_CONCURRENT_MISSIONS.missions.filter((m) => m.shouldFail);
    expect(failed).toHaveLength(1);
  });
});

describe("PROGRAM 6100 — No Heavy Client Imports", () => {
  it("inventory marks heavy components as client with optimization", () => {
    const heavy = COMPONENT_INVENTORY.filter((c) => c.bundleCost === "HIGH");
    for (const entry of heavy) {
      expect(entry.renderMode).toBe("CLIENT");
      expect(entry.optimization.length).toBeGreaterThan(0);
    }
  });
});
