/**
 * PROGRAM 6110 — Portfolio engine certification tests
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Portfolio } from "../../../domain/portfolio/aggregate";
import { canTransitionLifecycle } from "../../../domain/portfolio/lifecycle";
import { asVentureId, asWorkspaceId } from "../../../domain/shared/ids";
import {
  createInMemoryPortfolioStore,
  createPortfolioService,
} from "../service";
import { createTestPorts } from "../../testing/in-memory";
import { RAFAEL_VENTURES_LAB_FIXTURE } from "../../../composition/fixtures/rafael-ventures-lab";
import { createVentureAggregate, createWorkspaceAggregate } from "../../compat-domain";
import type { PortfolioCommand } from "../commands";

const ACTOR = "founder-rafael";

function cmdMeta() {
  return {
    actorId: ACTOR,
    commandId: `cmd-${Date.now()}-${Math.random()}`,
    correlationId: `corr-${Date.now()}`,
  };
}

function portfolioCmd<T extends PortfolioCommand["type"]>(
  type: T,
  payload: Extract<PortfolioCommand, { type: T }>["payload"],
): Extract<PortfolioCommand, { type: T }> {
  return { type, payload, meta: cmdMeta() } as Extract<PortfolioCommand, { type: T }>;
}

describe("Portfolio domain", () => {
  it("creates portfolio aggregate", () => {
    const r = Portfolio.create({
      id: "pf-1",
      workspaceId: asWorkspaceId("ws-1"),
      name: "Test Portfolio",
      slug: "test-portfolio",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.listVentures()).toHaveLength(0);
  });

  it("enforces lifecycle transitions", () => {
    expect(canTransitionLifecycle("IDEA", "DISCOVERING")).toBe(true);
    expect(canTransitionLifecycle("IDEA", "LAUNCHED")).toBe(false);
  });

  it("blocks closed venture missions", () => {
    const created = Portfolio.create({
      id: "pf-2",
      workspaceId: asWorkspaceId("ws-1"),
      name: "P",
      slug: "p",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const withVenture = created.value.addVenture({
      ventureId: asVentureId("ven-1"),
    });
    expect(withVenture.ok).toBe(true);
    if (!withVenture.ok) return;
    const closed = withVenture.value.closeVenture(asVentureId("ven-1"));
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.value.canStartMission(asVentureId("ven-1"))).toBe(false);
  });

  it("detects circular dependencies", () => {
    const created = Portfolio.create({
      id: "pf-3",
      workspaceId: asWorkspaceId("ws-1"),
      name: "P",
      slug: "p",
    });
    if (!created.ok) return;
    let p = created.value;
    p = p.addVenture({ ventureId: asVentureId("a") }).ok
      ? p.addVenture({ ventureId: asVentureId("a") }).value
      : p;
    const addA = p.addVenture({ ventureId: asVentureId("a") });
    const addB = addA.ok ? addA.value.addVenture({ ventureId: asVentureId("b") }) : addA;
    if (!addB.ok) return;
    p = addB.value;
    const dep1 = p.addDependency({
      id: "d1",
      portfolioId: p.id,
      sourceVentureId: asVentureId("a"),
      targetVentureId: asVentureId("b"),
      dependencyType: "TECHNICAL",
      approved: true,
      createdAt: new Date().toISOString(),
    });
    expect(dep1.ok).toBe(true);
    if (!dep1.ok) return;
    const dep2 = dep1.value.addDependency({
      id: "d2",
      portfolioId: p.id,
      sourceVentureId: asVentureId("b"),
      targetVentureId: asVentureId("a"),
      dependencyType: "TECHNICAL",
      approved: true,
      createdAt: new Date().toISOString(),
    });
    expect(dep2.ok).toBe(false);
  });
});

describe("Portfolio engine — RAFAEL VENTURES LAB certification", () => {
  let workspaceId: string;
  let portfolioId: string;
  let service: ReturnType<typeof createPortfolioService>;
  let portfolioStore: ReturnType<typeof createInMemoryPortfolioStore>;
  const ventureIds = new Map<string, string>();

  beforeEach(async () => {
    const { ports } = createTestPorts();
    portfolioStore = createInMemoryPortfolioStore();
    service = createPortfolioService({ ports, store: portfolioStore });

    workspaceId = ports.clock.createId("ws");
    const now = ports.clock.now();
    const { workspace, events: wsEvents } = createWorkspaceAggregate(
      workspaceId,
      {
        name: RAFAEL_VENTURES_LAB_FIXTURE.workspaceName,
        slug: RAFAEL_VENTURES_LAB_FIXTURE.workspaceSlug,
        ownerId: ACTOR,
      },
      now,
    );
    await ports.uow.workspaces.save(workspace);
    await ports.uow.events.append(wsEvents);

    const created = await service.executeCommand(
      portfolioCmd("CreatePortfolio", {
        workspaceId,
        name: RAFAEL_VENTURES_LAB_FIXTURE.portfolioName,
        slug: RAFAEL_VENTURES_LAB_FIXTURE.portfolioSlug,
        workspaceLimits: { ...RAFAEL_VENTURES_LAB_FIXTURE.workspaceLimits },
      }),
    );
    portfolioId = (created as { portfolioId: string }).portfolioId;
  });

  it("creates portfolio and five ventures via batch", async () => {
    const batch = await service.executeCommand(
      portfolioCmd("CreateVentureBatch", {
        workspaceId,
        portfolioId,
        ventures: RAFAEL_VENTURES_LAB_FIXTURE.ventures.map((v) => ({
          name: v.name,
          slug: v.slug,
          idea: v.idea,
          priority: v.priority,
          lifecycle: v.lifecycle,
        })),
        startMode: "CREATE_AND_PLAN",
      }),
    );
    const results = (batch as { results: Array<{ status: string; ventureId?: string; name: string }> })
      .results;
    expect(results.filter((r) => r.status === "created")).toHaveLength(5);

    for (const r of results) {
      if (r.ventureId) {
        const def = RAFAEL_VENTURES_LAB_FIXTURE.ventures.find((v) => v.name === r.name);
        if (def) ventureIds.set(def.slug, r.ventureId);
      }
    }
    expect(ventureIds.size).toBe(5);
  });

  it("full certification scenario", async () => {
    // Create 5 ventures
    const batch = await service.executeCommand(
      portfolioCmd("CreateVentureBatch", {
        workspaceId,
        portfolioId,
        ventures: RAFAEL_VENTURES_LAB_FIXTURE.ventures.map((v) => ({
          name: v.name,
          slug: v.slug,
          idea: v.idea,
          priority: v.priority,
          lifecycle: v.lifecycle,
        })),
        startMode: "CREATE_AND_PLAN",
      }),
    );
    const results = (batch as { results: Array<{ status: string; ventureId?: string; name: string }> })
      .results;
    for (const r of results) {
      if (r.ventureId) {
        const def = RAFAEL_VENTURES_LAB_FIXTURE.ventures.find((v) => v.name === r.name);
        if (def) ventureIds.set(def.slug, r.ventureId);
      }
    }

    // Pause CREATORPULSE
    const pausedId = ventureIds.get("creatorpulse")!;
    await service.executeCommand(
      portfolioCmd("PauseVenture", {
        workspaceId,
        portfolioId,
        ventureId: pausedId,
        reason: "resource reallocation",
      }),
    );

    // Set LOCALGROW AI to VALIDATING (already)
  // Allocate resources
    const orbitaId = ventureIds.get("orbita-sports")!;
    const tableflowId = ventureIds.get("tableflow")!;
    await service.executeCommand(
      portfolioCmd("AllocateBudget", {
        workspaceId,
        portfolioId,
        ventureId: orbitaId,
        resourceType: "AI_EXECUTION",
        limit: 5,
      }),
    );
    await service.executeCommand(
      portfolioCmd("AllocateBudget", {
        workspaceId,
        portfolioId,
        ventureId: tableflowId,
        resourceType: "BUILD_WORKER",
        limit: 2,
      }),
    );

    // Shared dependency
    await service.executeCommand(
      portfolioCmd("CreateVentureDependency", {
        workspaceId,
        portfolioId,
        sourceVentureId: tableflowId,
        targetVentureId: orbitaId,
        dependencyType: "TECHNICAL",
        description: RAFAEL_VENTURES_LAB_FIXTURE.sharedDependency.description,
      }),
    );

    // Shared asset
    await service.executeCommand(
      portfolioCmd("RegisterSharedAsset", {
        workspaceId,
        portfolioId,
        ownerVentureId: orbitaId,
        allowedConsumerIds: [tableflowId],
        assetType: "AUTH_PACKAGE",
        name: "Orbita Auth Module",
        version: "1.0.0",
      }),
    );

    // Policy
    await service.executeCommand(
      portfolioCmd("CreatePortfolioPolicy", {
        workspaceId,
        portfolioId,
        kind: "MAX_ACTIVE_VENTURES",
        config: { limit: 10 },
      }),
    );

    // Controlled failure isolation
    service.executor.simulateFailure(
      ventureIds.get(RAFAEL_VENTURES_LAB_FIXTURE.controlledFailureVentureSlug)!,
      "AI execution timeout",
    );

    // Query portfolio summary
    const summary = await service.executeQuery({
      type: "GetPortfolioSummary",
      payload: { workspaceId, portfolioId },
      meta: { actorId: ACTOR },
    });
    const model = summary as { ventures: Array<{ slug: string; paused: boolean; lifecycle: string }> };
    expect(model.ventures).toHaveLength(5);

    const paused = model.ventures.filter((v) => v.paused);
    expect(paused.length).toBeGreaterThanOrEqual(1);

    const active = model.ventures.filter((v) => !v.paused && !v.lifecycle.includes("CLOSED"));
    expect(active.length).toBeGreaterThanOrEqual(3);

  // List with pagination
    const list = await service.executeQuery({
      type: "ListPortfolioVentures",
      payload: { workspaceId, portfolioId, page: 1, pageSize: 3, sortBy: "priority" },
      meta: { actorId: ACTOR },
    });
    expect((list as { items: unknown[] }).items).toHaveLength(3);

    // Risks
    const risks = await service.executeQuery({
      type: "GetPortfolioRisks",
      payload: { workspaceId, portfolioId },
      meta: { actorId: ACTOR },
    });
    expect(Array.isArray(risks)).toBe(true);

    // Capacity
    const capacity = await service.executeQuery({
      type: "GetPortfolioCapacity",
      payload: { workspaceId, portfolioId },
      meta: { actorId: ACTOR },
    });
    expect((capacity as unknown[]).length).toBeGreaterThan(0);

    // Batch pause/resume
    const pauseBatch = await service.executeCommand(
      portfolioCmd("PauseVentureBatch", {
        workspaceId,
        portfolioId,
        ventureIds: [ventureIds.get("luxora-eyewear")!],
        reason: "review",
      }),
    );
    expect((pauseBatch as { results: Array<{ status: string }> }).results[0].status).toBe("paused");

    // Failure does not block other ventures
    const orbitaExec = await service.executor.submit(
      (await portfolioStore.getById(portfolioId))!,
      {
        workspaceId,
        portfolioId,
        ventureId: orbitaId,
        missionId: "mission-orbita",
        priority: "CRITICAL",
        executionClass: "AI",
        ownerId: ACTOR,
        isolationContext: `ws:${workspaceId}:ven:${orbitaId}`,
      },
    );
    expect(orbitaExec.status).toBe("ACCEPTED");

    const failedExec = await service.executor.submit(
      (await portfolioStore.getById(portfolioId))!,
      {
        workspaceId,
        portfolioId,
        ventureId: pausedId,
        missionId: "mission-creator",
        priority: "NORMAL",
        executionClass: "AI",
        ownerId: ACTOR,
        isolationContext: `ws:${workspaceId}:ven:${pausedId}`,
      },
    );
    expect(failedExec.status).toBe("REJECTED");
  });

  it("enforces workspace isolation", async () => {
    const otherWs = service["deps"].ports.clock.createId("ws");
    await expect(
      service.executeQuery({
        type: "GetPortfolio",
        payload: { workspaceId: otherWs, portfolioId },
        meta: { actorId: ACTOR },
      }),
    ).rejects.toThrow();
  });
});
