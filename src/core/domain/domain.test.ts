/**
 * Domain unit tests — PROGRAM 6010 folder entities (deep imports; avoid flat shadows).
 */
import { describe, expect, it } from "vitest";
import { asFounderId, asMissionId, asWorkspaceId, asCodebaseId } from "./shared/ids";
import { Confidence, Money, Percentage } from "./shared/value-objects";
import { DomainError } from "./shared/errors";
import { createCanonicalDomainEvent } from "./events/types";
import { Mission } from "./mission/entity";
import { migrateMissionSnapshot } from "./mission/migrate";
import { Decision } from "./decision/entity";
import { Artifact } from "./artifact/entity";
import { Output } from "./output/entity";
import { migrateOutputSnapshot } from "./output/migrate";
import { Build } from "./build/entity";

describe("shared IDs and value objects", () => {
  it("rejects empty branded ids", () => {
    expect(() => asWorkspaceId("  ")).toThrow();
    expect(asWorkspaceId("ws-1")).toBe("ws-1");
  });

  it("validates Money / Percentage / Confidence", () => {
    expect(Money(10, "usd").ok).toBe(true);
    expect(Money(10, "US").ok).toBe(false);
    expect(Percentage(50).ok).toBe(true);
    expect(Percentage(101).ok).toBe(false);
    expect(Confidence(0.5).ok).toBe(true);
    expect(Confidence(1.1).ok).toBe(false);
  });
});

describe("Mission aggregate", () => {
  const base = () =>
    Mission.create({
      id: "m-1",
      workspaceId: asWorkspaceId("ws-1"),
      founderId: asFounderId("f-1"),
      title: "Nexora",
    });

  it("constructs in DRAFT", () => {
    const r = base();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.props.status).toBe("DRAFT");
    expect(r.value.props.schemaVersion).toBe(1);
  });

  it("allows valid transitions and blocks invalid ones", () => {
    const created = base();
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const next = created.value.transition("UNDERSTANDING");
    expect(next.ok).toBe(true);
    const bad = created.value.transition("COMPLETED");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBeInstanceOf(DomainError);
  });

  it("requires blockedReason when blocking", () => {
    const created = base();
    if (!created.ok) return;
    const u = created.value.transition("UNDERSTANDING");
    if (!u.ok) return;
    const blocked = u.value.transition("BLOCKED");
    expect(blocked.ok).toBe(false);
    const okBlock = u.value.transition("BLOCKED", { blockedReason: "awaiting decision" });
    expect(okBlock.ok).toBe(true);
  });

  it("serializes and migrates snapshots", () => {
    const migrated = migrateMissionSnapshot({
      schemaVersion: 0,
      id: asMissionId("m-2"),
      workspaceId: asWorkspaceId("ws-1"),
      founderId: asFounderId("f-1"),
      title: "Old",
      status: "DRAFT",
      phase: "UNDERSTAND",
    });
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.value.schemaVersion).toBe(1);
    expect(migrated.value.intention).toBe("UNSPECIFIED");
  });
});

describe("Decision / Artifact / Output", () => {
  it("decision lifecycle without chain-of-thought fields", () => {
    const d = Decision.create({
      id: "d-1",
      workspaceId: asWorkspaceId("ws-1"),
      missionId: asMissionId("m-1"),
      title: "Pricing",
      description: "Choose plan",
      options: [
        { id: "a", label: "Free" },
        { id: "b", label: "Pro" },
      ],
    });
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(Object.keys(d.value.props)).not.toContain("reasoning");
    const pending = d.value.submitForApproval();
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const approved = pending.value.approve("b");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.value.props.status).toBe("APPROVED");
  });

  it("artifact is knowledge-only", () => {
    const a = Artifact.create({
      id: "a-1",
      workspaceId: asWorkspaceId("ws-1"),
      type: "PRD",
      title: "PRD v1",
    });
    expect(a.ok).toBe(true);
  });

  it("output transitions and migration", () => {
    const o = Output.create({
      id: "o-1",
      workspaceId: asWorkspaceId("ws-1"),
      missionId: asMissionId("m-1"),
      type: "WEBSITE_OUTPUT",
      title: "Site",
    });
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.value.transition("APPROVED").ok).toBe(false);
    expect(o.value.transition("GENERATING").ok).toBe(true);

    const mig = migrateOutputSnapshot({
      schemaVersion: 0,
      id: "o-2",
      workspaceId: "ws-1",
      missionId: "m-1",
      type: "VENTURE_OUTPUT",
      title: "V",
      status: "DRAFT",
    });
    expect(mig.ok).toBe(true);
  });
});

describe("Build and events", () => {
  it("build succeeds only from running", () => {
    const b = Build.create({
      id: "b-1",
      workspaceId: asWorkspaceId("ws-1"),
      missionId: asMissionId("m-1"),
      codebaseId: asCodebaseId("cb-1"),
    });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.succeed("digest").ok).toBe(false);
    const started = b.value.start();
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const done = started.value.succeed("abc");
    expect(done.ok).toBe(true);
  });

  it("creates canonical domain events", () => {
    const ev = createCanonicalDomainEvent({
      eventId: "e-1",
      eventType: "WorkspaceCreated",
      aggregateId: "ws-1",
      workspaceId: asWorkspaceId("ws-1"),
      actor: { type: "system", id: "bootstrap" },
      payload: { name: "Acme" },
      correlationId: "c-1",
    });
    expect(ev.eventType).toBe("WorkspaceCreated");
    expect(ev.version).toBe(1);
    expect(ev.payload.name).toBe("Acme");
    const json = JSON.parse(JSON.stringify(ev));
    expect(json.eventId).toBe("e-1");
  });
});
