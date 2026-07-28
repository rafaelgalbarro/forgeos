import { describe, expect, it } from "vitest";
import {
  mcStatusClass,
  normalizeMcStatus,
  primaryCtaFromVm,
} from "@/components/experience/mc-status";
import { toMissionControlVM } from "@/src/presentation/adapters/mission-query-adapter";
import type { MissionOverviewSnapshot } from "@/src/core/application/experience-snapshots";

function snap(partial: Partial<MissionOverviewSnapshot> & Pick<MissionOverviewSnapshot, "missionId">): MissionOverviewSnapshot {
  return {
    meta: {
      query: "GetMissionOverview",
      generatedAt: "2026-07-24T00:00:00.000Z",
      provenance: "DEMO",
      availability: "ready",
      ...partial.meta,
    },
    missionId: partial.missionId,
    objective: partial.objective ?? "Obj",
    stage: partial.stage ?? "unknown",
    nextDecision: partial.nextDecision ?? null,
    nextAction: partial.nextAction ?? "Continuar",
    ceoOpening: partial.ceoOpening ?? "Hola",
    planSummary: partial.planSummary ?? [],
    outputs: partial.outputs ?? [],
    activity: partial.activity ?? [],
    risks: partial.risks ?? [],
    approvals: partial.approvals ?? [],
  };
}

describe("mc-status normalization", () => {
  it("maps completed / executing / blocked / waiting / empty / partial / error", () => {
    expect(normalizeMcStatus("completed")).toBe("completed");
    expect(normalizeMcStatus("Running")).toBe("executing");
    expect(normalizeMcStatus("blocked")).toBe("blocked");
    expect(normalizeMcStatus("waiting")).toBe("waiting");
    expect(normalizeMcStatus("empty")).toBe("empty");
    expect(normalizeMcStatus("partial")).toBe("partial");
    expect(normalizeMcStatus("failed")).toBe("blocked");
    expect(normalizeMcStatus("")).toBe("unknown");
  });

  it("emits tone CSS classes", () => {
    expect(mcStatusClass("executing")).toContain("mc-status--executing");
    expect(mcStatusClass("completed")).toContain("mc-status--completed");
  });
});

describe("CTA from read model", () => {
  it("create venture when empty", () => {
    expect(primaryCtaFromVm({ missionId: null, availability: "empty", nextAction: "x", nextDecision: null })).toEqual({
      label: "Create Venture",
      href: "/os/creator",
    });
  });

  it("decision CTA when nextDecision present", () => {
    expect(
      primaryCtaFromVm({
        missionId: "m1",
        availability: "ready",
        nextAction: "Continuar",
        nextDecision: "Approve GTM",
      })
    ).toEqual({
      label: "Resolver decisión",
      href: "/missions/m1?section=decisions",
    });
  });

  it("toMissionControlVM never invents completed plan stages", () => {
    const vm = toMissionControlVM(
      snap({
        missionId: "demo",
        planSummary: ["Discovery", "Build"],
        stage: "executing",
      })
    );
    expect(vm.planStages.every((s) => s.status === "unknown")).toBe(true);
    expect(vm.planStages.map((s) => s.status)).toEqual(["unknown", "unknown"]);
    expect(vm.primaryCta.href).toContain("/mission-control/");
  });
});
