import { describe, expect, it } from "vitest";
import {
  canonicalMissionToLegacy,
  legacyArtifactToCanonical,
  legacyBuildToCanonical,
  legacyMissionSessionToCanonical,
  legacyMissionToCanonical,
  legacyOutputToCanonical,
} from "../../legacy/adapters/domain";

describe("legacy mappers", () => {
  it("maps Mission and round-trips essential fields", () => {
    const { mission, gaps } = legacyMissionToCanonical(
      {
        id: "m-legacy",
        title: "Legacy mission",
        intention: "VENTURE",
        phase: "PLAN",
        idea: "An idea",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      { workspaceId: "ws-1", founderId: "f-1" }
    );
    expect(mission.props.title).toBe("Legacy mission");
    expect(mission.props.intention).toBe("VENTURE");
    expect(gaps.statusApproximate).toBe(true);
    const back = canonicalMissionToLegacy(mission);
    expect(back.id).toBe("m-legacy");
    expect(back.intention).toBe("VENTURE");
    expect(back.phase).toBe("PLAN");
  });

  it("maps MissionSession statuses", () => {
    const { mission } = legacyMissionSessionToCanonical({
      missionId: "ms-1",
      workspaceId: "ws-1",
      founderId: "f-1",
      status: "BUILDING",
      state: { sessionStatus: "BUILDING", phase: "BUILD" },
      intent: { primary: "WEBSITE", extractedIdea: "Landing" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(mission.props.status).toBe("BUILDING");
    expect(mission.props.intention).toBe("WEBSITE");
  });

  it("maps artifacts with gaps for executable-ish types", () => {
    const { artifact, gaps } = legacyArtifactToCanonical(
      { id: "art-1", type: "build", label: "Build output" },
      { workspaceId: "ws-1", missionId: "m-1" }
    );
    expect(artifact.props.type).toBe("OTHER");
    expect(gaps.notes.length).toBeGreaterThan(0);
  });

  it("maps creation outputs and drops payload", () => {
    const { output, gaps } = legacyOutputToCanonical(
      {
        outputId: "out-1",
        missionId: "m-1",
        type: "WEBSITE_OUTPUT",
        title: "Site",
        status: "PREVIEW_READY",
        version: "1.2.0",
      },
      { workspaceId: "ws-1" }
    );
    expect(output.props.status).toBe("PREVIEW_READY");
    expect(gaps.payloadDropped).toBe(true);
  });

  it("maps code project to codebase + synthetic build", () => {
    const { codebase, build, gaps } = legacyBuildToCanonical(
      {
        projectId: "proj-1",
        missionId: "m-1",
        projectType: "website",
        name: "Site code",
        status: "READY_FOR_PREVIEW",
        files: [{ path: "package.json", language: "json", checksum: "x" }],
      },
      { workspaceId: "ws-1" }
    );
    expect(codebase.props.kind).toBe("WEBSITE");
    expect(codebase.props.fileRefs).toHaveLength(1);
    expect(build.props.status).toBe("SUCCEEDED");
    expect(gaps.buildInferred).toBe(true);
  });
});
