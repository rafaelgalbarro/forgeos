/**
 * PROGRAM 6070 — Migration tests (vitest).
 * Covers: V1 only, V2 only, dual read, dual write, fallback, rollback,
 * partial migration, corrupted legacy, corrupted V2.
 */

import { describe, it, beforeEach, expect } from "vitest";

import {
  REGISTRY_SEED_COUNT,
  MIGRATION_REGISTRY,
  V2_FLAG_DEFAULTS,
  readV2FeatureFlags,
  isLegacyOnlyMode,
  dualReadMission,
  createMissionReadMemoryStores,
  dualWriteDecision,
  createDecisionMemoryStores,
  dualReadOutput,
  createOutputMemoryStores,
  dualReadService,
  dualWriteService,
  resetMigrationTelemetry,
  getMigrationTelemetry,
  planRollback,
  planFullLegacyRollback,
  migrateMissionsV2,
  evaluateDeprecationGates,
  loadMigrationDashboardSummary,
  FLAG_MATRICES,
} from "../../src/core/migration/index";

beforeEach(() => {
  resetMigrationTelemetry();
  for (const key of Object.keys(V2_FLAG_DEFAULTS)) {
    delete process.env[key];
  }
});

describe("PROGRAM 6070 — registry & flags", () => {
  it("seeds 10 real components", () => {
    expect(REGISTRY_SEED_COUNT).toBe(10);
    expect(MIGRATION_REGISTRY).toHaveLength(10);
  });

  it("defaults all V2 flags to false", () => {
    const flags = readV2FeatureFlags({});
    for (const [k, v] of Object.entries(flags)) {
      expect(v, k).toBe(false);
    }
    expect(isLegacyOnlyMode({})).toBe(true);
  });
});

describe("V1 only (flags off)", () => {
  it("dual-read uses legacy without fallback noise", async () => {
    const stores = createMissionReadMemoryStores();
    stores.seedLegacy({
      id: "m1",
      title: "Legacy",
      status: "active",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    stores.seedV2({
      id: "m1",
      status: "BUILDING",
      updatedAt: "2026-01-02T00:00:00.000Z",
      intent: { primary: "V2" },
    });

    const result = await dualReadMission({
      id: "m1",
      getV2: stores.getV2,
      getLegacy: stores.getLegacy,
    });

    expect(result.source).toBe("legacy");
    expect(result.fallbackUsed).toBe(false);
    expect(result.value?.title).toBe("Legacy");
    expect(getMigrationTelemetry().fallbacks).toHaveLength(0);
  });
});

describe("V2 only / dual read", () => {
  it("reads V2 when forceDual and V2 present", async () => {
    const stores = createMissionReadMemoryStores();
    stores.seedLegacy({
      id: "m1",
      title: "Legacy",
      status: "active",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    stores.seedV2({
      id: "m1",
      status: "active",
      updatedAt: "2026-01-02T00:00:00.000Z",
      intent: { primary: "V2 idea" },
    });

    const result = await dualReadMission({
      id: "m1",
      getV2: stores.getV2,
      getLegacy: stores.getLegacy,
      forceDual: true,
    });

    expect(result.source).toBe("v2");
    expect(result.fallbackUsed).toBe(false);
    expect(result.value?.title).toBe("V2 idea");
  });

  it("registers fallback when V2 misses", async () => {
    const stores = createMissionReadMemoryStores();
    stores.seedLegacy({
      id: "m1",
      title: "OnlyLegacy",
      status: "active",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const result = await dualReadMission({
      id: "m1",
      getV2: stores.getV2,
      getLegacy: stores.getLegacy,
      forceDual: true,
    });

    expect(result.source).toBe("legacy");
    expect(result.fallbackUsed).toBe(true);
    expect(result.inconsistency).toBeTruthy();
    expect(getMigrationTelemetry().fallbacks).toHaveLength(1);
  });

  it("surfaces status inconsistency without hiding V2", async () => {
    const stores = createMissionReadMemoryStores();
    stores.seedLegacy({
      id: "m1",
      title: "X",
      status: "active",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    stores.seedV2({
      id: "m1",
      status: "BUILDING",
      updatedAt: "2026-01-02T00:00:00.000Z",
      intent: { primary: "X" },
    });

    const result = await dualReadMission({
      id: "m1",
      getV2: stores.getV2,
      getLegacy: stores.getLegacy,
      forceDual: true,
    });

    expect(result.source).toBe("v2");
    expect(result.inconsistency).toContain("status_mismatch");
    expect(getMigrationTelemetry().divergences).toHaveLength(1);
  });
});

describe("dual write", () => {
  it("writes both when forceDual", async () => {
    const stores = createDecisionMemoryStores();
    const decision = {
      id: "d1",
      missionId: "m1",
      status: "resolved" as const,
      title: "Pick stack",
      resolution: "nextjs",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const result = await dualWriteDecision({
      decision,
      writeV2: stores.writeV2,
      writeLegacy: stores.writeLegacy,
      forceDual: true,
    });

    expect(result.v2Success).toBe(true);
    expect(result.legacySuccess).toBe(true);
    expect(result.divergence).toBeNull();
    expect(result.retirementCondition).toContain("2026-10-01");
    expect(stores.legacy.get("d1")?.resolution).toBe("nextjs");
    expect(stores.v2.get("d1")?.resolution).toBe("nextjs");
  });

  it("records divergence and repair when legacy fails", async () => {
    let repaired = false;
    const result = await dualWriteService.write({
      component: "decisions",
      forceDual: true,
      writeV2: () => undefined,
      writeLegacy: () => {
        throw new Error("legacy down");
      },
      repair: () => {
        repaired = true;
      },
      retryOnce: false,
    });

    expect(result.v2Success).toBe(true);
    expect(result.legacySuccess).toBe(false);
    expect(result.divergence).toBeTruthy();
    expect(result.repaired).toBe(true);
    expect(repaired).toBe(true);
  });
});

describe("corrupted stores", () => {
  it("handles corrupted legacy (throw) with flags off", async () => {
    const result = await dualReadService.read({
      component: "outputs",
      readV2: async () => ({ id: "o1" }),
      readLegacy: async () => {
        throw new Error("corrupted legacy json");
      },
    });
    expect(result.source).toBe("none");
    expect(result.inconsistency).toContain("legacy_read_error");
  });

  it("handles corrupted V2 then falls back", async () => {
    const stores = createOutputMemoryStores();
    stores.seedLegacy({
      id: "o1",
      missionId: "m1",
      type: "website",
      version: "1",
      status: "ready",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const result = await dualReadOutput({
      id: "o1",
      forceDual: true,
      getV2: async () => {
        throw new Error("corrupted v2");
      },
      getLegacy: stores.getLegacy,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.source).toBe("legacy");
    expect(result.inconsistency).toContain("v2_error");
  });
});

describe("rollback", () => {
  it("plans component rollback with flag map", () => {
    const plan = planRollback("mission.reads");
    expect(plan.ok).toBe(true);
    expect(plan.flagsToApply.ENABLE_V2_QUERIES).toBe(false);
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("plans full legacy rollback", () => {
    const plan = planFullLegacyRollback();
    expect(plan.ok).toBe(true);
    expect(plan.flagsToApply.ENABLE_V2_DOMAIN).toBe(false);
    expect(plan.flagsToApply.ENABLE_V2_COMPANY_OS).toBe(false);
  });
});

describe("partial / idempotent migration", () => {
  it("migrates only missing rows and is idempotent", async () => {
    const legacy = [
      { id: "m1", title: "A", status: "active", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "m2", title: "B", status: "active", updatedAt: "2026-01-01T00:00:00.000Z" },
    ];
    const v2: Array<{
      id: string;
      title: string;
      status: string;
      updatedAt: string;
      sourceHint: "v2" | "legacy";
    }> = [
      {
        id: "m1",
        title: "A",
        status: "active",
        updatedAt: "2026-01-01T00:00:00.000Z",
        sourceHint: "v2",
      },
    ];

    const report1 = await migrateMissionsV2({
      dryRun: false,
      loadLegacy: () => legacy,
      loadV2: () => v2,
      writeV2: (row) => {
        v2.push(row);
      },
    });

    expect(report1.ok).toBe(true);
    expect(report1.migrated).toBe(1);
    expect(report1.skipped).toBe(1);
    expect(report1.idempotent).toBe(true);

    const report2 = await migrateMissionsV2({
      dryRun: false,
      loadLegacy: () => legacy,
      loadV2: () => v2,
      writeV2: (row) => {
        v2.push(row);
      },
    });
    expect(report2.migrated).toBe(0);
    expect(report2.skipped).toBe(2);
  });

  it("aborts on corrupted legacy schema", async () => {
    const report = await migrateMissionsV2({
      dryRun: false,
      loadLegacy: () => [{ title: "no-id" } as { id: string }],
      loadV2: () => [],
      writeV2: () => {
        throw new Error("should not write");
      },
    });
    expect(report.ok).toBe(false);
    expect(report.pre.schemaOk).toBe(false);
    expect(report.migrated).toBe(0);
  });
});

describe("deprecation gates", () => {
  it("blocks remove while consumers exist", () => {
    const r = evaluateDeprecationGates("mission.reads", {
      consumerCount: 2,
      dataMigrated: true,
      testsPass: true,
      observabilityClear: true,
      rollbackProven: true,
    });
    expect(r.canRemove).toBe(false);
    expect(r.blockers.some((b) => b.includes("consumers"))).toBe(true);
  });
});

describe("dashboard summary", () => {
  it("loads server-safe summary", () => {
    const s = loadMigrationDashboardSummary();
    expect(s.seedCount).toBe(10);
    expect(s.legacyOnly).toBe(true);
    expect(s.matrices.allOff).toBeTruthy();
    expect(FLAG_MATRICES.fullV2Candidate.ENABLE_V2_COMPANY_OS).toBe(true);
  });
});
