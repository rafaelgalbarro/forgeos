/**
 * PROGRAM 6040 — Unit tests (transitions, versioning, idempotency, projections, adapters, ordering, failed listener)
 * Run via: npm run test:events
 */

import assert from "node:assert/strict";
import {
  createDomainEventEnvelope,
  createTransitionService,
  createMemoryEventLog,
  createCanonicalEventBus,
  createProcessedEventRegistry,
  handleIdempotently,
  rebuildProjectionsFromLog,
  deriveMissionTimeline,
  defaultUpcasterPipeline,
  isCompatibleVersion,
  adaptRuntimeEvent,
  adaptLiveMissionEvent,
  MissionStateMachine,
  BuildStateMachine,
  EVENTS_VERSION,
} from "../index";
import type { RuntimeEvent } from "@/lib/runtime/event-bus/types";
import type { MissionEvent } from "@/lib/mission-control/live-mission/types";

type TestFn = () => void | Promise<void>;

const tests: { name: string; fn: TestFn }[] = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

test("events version constant", () => {
  assert.ok(EVENTS_VERSION.includes("6040"));
});

test("valid mission transition DRAFT→UNDERSTANDING", () => {
  const svc = createTransitionService();
  const result = svc.applyTransition({
    machineId: "Mission",
    from: "DRAFT",
    to: "UNDERSTANDING",
    event: "MISSION_STARTED",
  });
  assert.equal(result.ok, true);
});

test("invalid mission transition DRAFT→COMPLETED", () => {
  const svc = createTransitionService();
  const result = svc.applyTransition({
    machineId: "Mission",
    from: "DRAFT",
    to: "COMPLETED",
    event: "MISSION_COMPLETED",
  });
  assert.equal(result.ok, false);
});

test("build valid and invalid transitions", () => {
  const svc = createTransitionService();
  assert.equal(
    svc.applyTransition({
      machineId: "Build",
      from: "QUEUED",
      to: "RUNNING",
      event: "BUILD_STARTED",
    }).ok,
    true
  );
  assert.equal(
    svc.applyTransition({
      machineId: "Build",
      from: "QUEUED",
      to: "SUCCEEDED",
      event: "BUILD_SUCCEEDED",
    }).ok,
    false
  );
  assert.ok(MissionStateMachine.states.length >= 8);
  assert.ok(BuildStateMachine.states.some((s) => s.terminal));
});

test("blocked transition requires guard", () => {
  const svc = createTransitionService();
  const denied = svc.applyTransition({
    machineId: "Mission",
    from: "BLOCKED",
    to: "BUILDING",
    event: "MISSION_UNBLOCKED",
    context: { blockResolved: false },
  });
  assert.equal(denied.ok, false);
  const allowed = svc.applyTransition({
    machineId: "Mission",
    from: "BLOCKED",
    to: "BUILDING",
    event: "MISSION_UNBLOCKED",
    context: { blockResolved: true },
  });
  assert.equal(allowed.ok, true);
});

test("event versioning upcast deprecated + compatibility", () => {
  const legacy = createDomainEventEnvelope({
    eventType: "VENTURE_STATE_CHANGED",
    catalogKind: "integration",
    aggregateType: "Mission",
    aggregateId: "m1",
    workspaceId: "ws1",
    missionId: "m1",
    payload: { status: "RUNNING" },
    eventVersion: 1,
  });
  const up = defaultUpcasterPipeline(legacy);
  assert.equal(up.eventType, "MISSION_STATE_CHANGED");
  assert.ok(up.originalPayload);
  assert.equal(isCompatibleVersion(1, 2, true), true);
  assert.equal(isCompatibleVersion(2, 1, false), false);
});

test("duplicate handling skips second side effect", async () => {
  const registry = createProcessedEventRegistry();
  const event = createDomainEventEnvelope({
    eventType: "DEPLOYMENT_STATE_CHANGED",
    catalogKind: "domain",
    aggregateType: "Deployment",
    aggregateId: "d1",
    workspaceId: "ws1",
    payload: { to: "READY" },
  });
  let calls = 0;
  const first = await handleIdempotently(registry, "deploy-handler", event, async () => {
    calls += 1;
  });
  const second = await handleIdempotently(registry, "deploy-handler", event, async () => {
    calls += 1;
  });
  assert.equal(first.executed, true);
  assert.equal(second.skipped, true);
  assert.equal(calls, 1);
});

test("projection rebuild + event ordering", async () => {
  const log = createMemoryEventLog();
  const earlier = createDomainEventEnvelope({
    eventType: "MISSION_STARTED",
    catalogKind: "domain",
    aggregateType: "Mission",
    aggregateId: "m1",
    workspaceId: "ws1",
    missionId: "m1",
    occurredAt: "2026-01-01T10:00:00.000Z",
    payload: { to: "UNDERSTANDING", label: "started" },
    actor: { kind: "founder", id: "f1", label: "Founder" },
  });
  const later = createDomainEventEnvelope({
    eventType: "BUILD_STATE_CHANGED",
    catalogKind: "domain",
    aggregateType: "Build",
    aggregateId: "b1",
    workspaceId: "ws1",
    missionId: "m1",
    occurredAt: "2026-01-01T11:00:00.000Z",
    payload: { to: "RUNNING", label: "build" },
  });
  // Append out of order intentionally
  await log.append(later);
  await log.append(earlier);
  const bundle = await rebuildProjectionsFromLog(log, { missionId: "m1" });
  assert.equal(bundle.eventCount, 2);
  assert.equal(bundle.missionTimeline[0]?.action, "MISSION_STARTED");
  assert.equal(bundle.missionTimeline[1]?.action, "BUILD_STATE_CHANGED");
  assert.equal(bundle.buildStatus[0]?.status, "RUNNING");
  const timeline = deriveMissionTimeline(await log.query({ missionId: "m1" }), {
    technicalMode: true,
    missionId: "m1",
  });
  assert.ok(timeline[0]?.correlationId);
  const publicTimeline = deriveMissionTimeline(await log.query({ missionId: "m1" }), {
    technicalMode: false,
    missionId: "m1",
  });
  assert.equal(publicTimeline[0]?.correlationId, undefined);
});

test("adapter compatibility preserves originalPayload", () => {
  const runtime = {
    id: "evt_1",
    type: "BUILD_COMPLETED",
    category: "build",
    timestamp: "2026-01-01T12:00:00.000Z",
    source: "pipeline",
    payload: { ventureId: "v1", buildId: "b1", status: "success" },
  } as RuntimeEvent;
  const adapted = adaptRuntimeEvent(runtime, { missionId: "m1" });
  assert.equal(adapted.eventType, "BUILD_STATE_CHANGED");
  assert.ok(adapted.originalPayload);
  assert.equal(adapted.sourceEventRef, "runtime:pipeline:evt_1");

  const live: MissionEvent = {
    id: "me_1",
    timestamp: "2026-01-01T12:01:00.000Z",
    type: "worker_complete",
    label: "Worker done",
    department: "CTO",
    metadata: { missionId: "m1" },
  };
  const liveAdapted = adaptLiveMissionEvent(live, { missionId: "m1" });
  assert.ok(liveAdapted.originalPayload);
  assert.equal(liveAdapted.catalogKind, "domain");
});

test("failed listener recorded without breaking bus", async () => {
  const bus = createCanonicalEventBus({ upcast: false });
  let good = 0;
  bus.subscribeAll(async () => {
    good += 1;
  });
  bus.subscribe("MISSION_STARTED", async () => {
    throw new Error("boom api_key=secret123");
  });
  await bus.publish(
    createDomainEventEnvelope({
      eventType: "MISSION_STARTED",
      catalogKind: "domain",
      aggregateType: "Mission",
      aggregateId: "m1",
      workspaceId: "ws1",
      missionId: "m1",
      payload: { to: "UNDERSTANDING" },
    })
  );
  assert.equal(good, 1);
  const obs = bus.getObservability().listObservations();
  assert.ok(obs.some((o) => o.status === "failed"));
  const failed = obs.find((o) => o.status === "failed");
  assert.ok(failed?.errorMessage?.includes("[redacted]") || failed?.errorMessage?.includes("boom"));
  assert.ok(!failed?.errorMessage?.includes("secret123"));
});

test("envelope rejects chain-of-thought keys", () => {
  assert.throws(() =>
    createDomainEventEnvelope({
      eventType: "MISSION_STARTED",
      catalogKind: "domain",
      aggregateType: "Mission",
      aggregateId: "m1",
      workspaceId: "ws1",
      payload: { chainOfThought: "nope" } as never,
    })
  );
});

export async function runProgram6040Tests(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed += 1;
      console.error(`  ✗ ${t.name}`);
      console.error(e);
    }
  }
  return { passed, failed };
}

if (typeof require !== "undefined" && require.main === module) {
  void runProgram6040Tests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}
