/**
 * Program 6020 application layer tests (vitest).
 */

import { describe, expect, it } from "vitest";
import {
  CanDeployProduction,
  createApplicationLayer,
  createTestPorts,
  toMissionOverview,
} from "../index";
import { createMissionAggregate } from "../compat-domain";

function meta(actorId = "actor-1", extra: Record<string, string> = {}) {
  return { actorId, ...extra };
}

describe("Program 6020 — Application CQ layer", () => {
  it("success: create workspace → venture → mission and query overview", async () => {
    const { ports } = createTestPorts();
    const app = createApplicationLayer(ports);

    const ws = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "Acme", slug: "acme" },
      meta: meta(),
    });
    expect(ws.ok).toBe(true);
    if (!ws.ok) return;
    const workspaceId = ws.data.id;

    const ven = await app.commandBus.execute({
      type: "CreateVenture",
      payload: { workspaceId, name: "Nexora", slug: "nexora", idea: "AI ops" },
      meta: meta(),
    });
    expect(ven.ok).toBe(true);
    if (!ven.ok) return;

    const mis = await app.commandBus.execute({
      type: "CreateMission",
      payload: { workspaceId, ventureId: ven.data.id, idea: "Ship MVP" },
      meta: { ...meta(), workspaceId, commandId: "cmd-1", idempotencyKey: "idem-1" },
    });
    expect(mis.ok).toBe(true);
    if (!mis.ok) return;

    const overview = await app.queryBus.execute({
      type: "GetMissionOverview",
      payload: { missionId: mis.data.id },
      meta: meta(),
    });
    expect(overview.ok).toBe(true);
    if (!overview.ok) return;
    expect(overview.data.workspaceId).toBe(workspaceId);
    expect(overview.data.idea).toBe("Ship MVP");
  });

  it("policy denied: production deployment", async () => {
    const { ports } = createTestPorts();
    const app = createApplicationLayer(ports);
    const ws = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "Acme", slug: "acme2" },
      meta: meta(),
    });
    expect(ws.ok).toBe(true);
    if (!ws.ok) return;
    const mis = await app.commandBus.execute({
      type: "CreateMission",
      payload: { workspaceId: ws.data.id },
      meta: { ...meta(), workspaceId: ws.data.id, commandId: "m2" },
    });
    expect(mis.ok).toBe(true);
    if (!mis.ok) return;

    const dep = await app.commandBus.execute({
      type: "RequestDeployment",
      payload: {
        workspaceId: ws.data.id,
        missionId: mis.data.id,
        target: "production",
      },
      meta: { ...meta(), workspaceId: ws.data.id, commandId: "dep-prod" },
    });
    expect(dep.ok).toBe(false);
    if (dep.ok) return;
    expect(dep.error.code).toBe("PRODUCTION_DEPLOY_DISABLED");
    expect(dep.error.category).toBe("authorization");
    expect(CanDeployProduction({ actorId: "a", roles: ["owner"] }).allowed).toBe(false);
  });

  it("policy denied: viewer cannot start build", async () => {
    const { ports } = createTestPorts({ roles: ["viewer"] });
    const app = createApplicationLayer(ports);
    const ws = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "W", slug: "w-view" },
      meta: meta(),
    });
    expect(ws.ok).toBe(true);
    if (!ws.ok) return;
    const mis = await app.commandBus.execute({
      type: "CreateMission",
      payload: { workspaceId: ws.data.id },
      meta: { ...meta(), workspaceId: ws.data.id, commandId: "m-view" },
    });
    expect(mis.ok).toBe(true);
    if (!mis.ok) return;

    const build = await app.commandBus.execute({
      type: "StartBuild",
      payload: { workspaceId: ws.data.id, missionId: mis.data.id },
      meta: { ...meta(), workspaceId: ws.data.id, commandId: "bld-1" },
    });
    expect(build.ok).toBe(false);
    if (build.ok) return;
    expect(build.error.category).toBe("authorization");
  });

  it("entity missing: get mission overview", async () => {
    const { ports } = createTestPorts();
    const app = createApplicationLayer(ports);
    const res = await app.queryBus.execute({
      type: "GetMissionOverview",
      payload: { missionId: "missing" },
      meta: meta(),
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.category).toBe("not_found");
  });

  it("invalid transition: pause completed mission", async () => {
    const { ports, store } = createTestPorts();
    const now = ports.clock.now();
    const { mission } = createMissionAggregate(
      "mis-done",
      { workspaceId: "ws-1", founderId: "actor-1" },
      now,
    );
    mission.status = "COMPLETED";
    store.workspaces.set("ws-1", {
      id: "ws-1",
      name: "W",
      slug: "w",
      ownerId: "actor-1",
      organizationId: "org",
      ventureIds: [],
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    store.missions.set(mission.id, mission);
    const app = createApplicationLayer(ports);
    const res = await app.commandBus.execute({
      type: "PauseMission",
      payload: { missionId: mission.id },
      meta: meta(),
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.category).toBe("invalid_transition");
  });

  it("idempotency: duplicate CreateMission returns same result", async () => {
    const { ports } = createTestPorts();
    const app = createApplicationLayer(ports);
    const ws = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "Idem", slug: "idem" },
      meta: meta(),
    });
    expect(ws.ok).toBe(true);
    if (!ws.ok) return;

    const cmd = {
      type: "CreateMission" as const,
      payload: { workspaceId: ws.data.id, idea: "once" },
      meta: {
        ...meta(),
        workspaceId: ws.data.id,
        commandId: "cmd-idem",
        idempotencyKey: "key-idem",
      },
    };
    const first = await app.commandBus.execute(cmd);
    const second = await app.commandBus.execute(cmd);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.data.id).toBe(second.data.id);
    expect(second.data.replayed).toBe(true);
    const missions = await ports.uow.missions.listByWorkspace(ws.data.id);
    expect(missions).toHaveLength(1);
  });

  it("repository failure surfaces as error (not hidden)", async () => {
    const { ports, store } = createTestPorts();
    const app = createApplicationLayer(ports);
    store.failNextSave = true;
    const res = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "Fail", slug: "fail" },
      meta: meta(),
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.message.length).toBeGreaterThan(0);
  });

  it("event emission on mission create", async () => {
    const { ports, store } = createTestPorts();
    const app = createApplicationLayer(ports);
    const ws = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "E", slug: "evt" },
      meta: meta(),
    });
    expect(ws.ok).toBe(true);
    if (!ws.ok) return;
    const mis = await app.commandBus.execute({
      type: "CreateMission",
      payload: { workspaceId: ws.data.id },
      meta: { ...meta(), workspaceId: ws.data.id, commandId: "evt-m", idempotencyKey: "evt-k" },
    });
    expect(mis.ok).toBe(true);
    expect(store.events.some((e) => e.type === "WorkspaceCreated")).toBe(true);
    expect(store.events.some((e) => e.type === "MissionCreated")).toBe(true);
  });

  it("transaction failure rolls back staged writes", async () => {
    const { ports, store } = createTestPorts();
    const app = createApplicationLayer(ports);
    store.failNextCommit = true;
    const res = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "Tx", slug: "tx" },
      meta: meta(),
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.category).toBe("transaction");
    expect(store.workspaces.size).toBe(0);
  });

  it("mapping to read model does not expose aggregate methods", () => {
    const now = "2026-07-24T12:00:00.000Z";
    const { mission } = createMissionAggregate(
      "mis-map",
      { workspaceId: "ws", founderId: "a", idea: "x" },
      now,
    );
    const view = toMissionOverview(mission);
    expect(view.id).toBe("mis-map");
    expect(view.idea).toBe("x");
    expect("timeline" in view).toBe(false);
    expect((view as { pause?: unknown }).pause).toBeUndefined();
  });

  it("approve release persists approval id with release", async () => {
    const { ports } = createTestPorts();
    const app = createApplicationLayer(ports);
    const ws = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "Rel", slug: "rel" },
      meta: meta(),
    });
    expect(ws.ok).toBe(true);
    if (!ws.ok) return;
    const mis = await app.commandBus.execute({
      type: "CreateMission",
      payload: { workspaceId: ws.data.id },
      meta: { ...meta(), workspaceId: ws.data.id, commandId: "rel-m" },
    });
    expect(mis.ok).toBe(true);
    if (!mis.ok) return;
    const rel = await app.commandBus.execute({
      type: "CreateRelease",
      payload: { workspaceId: ws.data.id, missionId: mis.data.id, version: "1.0.0" },
      meta: { ...meta(), workspaceId: ws.data.id },
    });
    expect(rel.ok).toBe(true);
    if (!rel.ok) return;
    const apr = await app.commandBus.execute({
      type: "ApproveRelease",
      payload: { releaseId: rel.data.id },
      meta: meta(),
    });
    expect(apr.ok).toBe(true);
    if (!apr.ok) return;
    expect(apr.data.approvalId).toBeTruthy();
    expect(apr.data.status).toBe("approved");
  });

  it("plan+generate output updates mission outputIds together", async () => {
    const { ports } = createTestPorts();
    const app = createApplicationLayer(ports);
    const ws = await app.commandBus.execute({
      type: "CreateWorkspace",
      payload: { name: "Out", slug: "out" },
      meta: meta(),
    });
    expect(ws.ok).toBe(true);
    if (!ws.ok) return;
    const mis = await app.commandBus.execute({
      type: "CreateMission",
      payload: { workspaceId: ws.data.id },
      meta: { ...meta(), workspaceId: ws.data.id, commandId: "out-m" },
    });
    expect(mis.ok).toBe(true);
    if (!mis.ok) return;
    const planned = await app.commandBus.execute({
      type: "PlanOutput",
      payload: {
        workspaceId: ws.data.id,
        missionId: mis.data.id,
        kind: "brief",
        title: "Brief",
      },
      meta: { ...meta(), workspaceId: ws.data.id },
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    const generated = await app.commandBus.execute({
      type: "GenerateOutput",
      payload: { outputId: planned.data.id },
      meta: { ...meta(), commandId: "gen-1", idempotencyKey: "gen-1" },
    });
    expect(generated.ok).toBe(true);
    const mission = await ports.uow.missions.getById(mis.data.id);
    expect(mission).toBeTruthy();
    expect(mission!.outputIds.includes(planned.data.id)).toBe(true);
    const cards = await app.queryBus.execute({
      type: "GetMissionOutputs",
      payload: { missionId: mis.data.id },
      meta: meta(),
    });
    expect(cards.ok).toBe(true);
    if (!cards.ok) return;
    expect(cards.data).toHaveLength(1);
    expect(cards.data[0].status).toBe("ready");
  });
});
