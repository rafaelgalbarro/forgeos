import { afterEach, describe, expect, it } from "vitest";
import { setCompositionRoot } from "@/src/core/composition";
import { buildPortfolioCommandCenterReadModel } from "../query-handler";

function withStore(meta: Record<string, unknown>, extras?: { missions?: Array<Record<string, unknown>>; previews?: Array<Record<string, unknown>>; releases?: Array<Record<string, unknown>> }) {
  setCompositionRoot({
    store: {
      ventures: new Map(),
      missions: new Map((extras?.missions ?? []).map((m) => [String(m.id), m])),
      decisions: new Map(),
      outputs: new Map(),
      codebases: new Map(),
      builds: new Map(),
      previews: new Map((extras?.previews ?? []).map((p) => [String(p.id), p])),
      releases: new Map((extras?.releases ?? []).map((r) => [String(r.id), r])),
      deployments: new Map(),
      workflowPlans: new Map(),
      deliverySnapshots: new Map(),
      lineage: new Map(),
      previewClassifications: new Map(),
      meta,
    },
  } as never);
}

describe("portfolio command center query", () => {
  afterEach(() => setCompositionRoot(null));

  it("returns null when portfolio read model unavailable", () => {
    withStore({});
    expect(buildPortfolioCommandCenterReadModel({ portfolioId: "missing" })).toBeNull();
  });

  it("builds paginated model from portfolio6150 projection", () => {
    withStore(
      {
        portfolio6150: {
          readModel: {
            portfolioId: "pf-1",
            workspaceId: "ws-1",
            name: "RAFAEL VENTURES LAB",
            freshness: "LIVE",
            summary: {
              totalVentures: 2,
              activeVentures: 1,
              pausedVentures: 1,
              atRiskVentures: 0,
              activeExecutions: 1,
            },
            ventures: [
              {
                ventureId: "v-1",
                name: "ORBITA SPORTS",
                slug: "orbita",
                priority: "HIGH",
                lifecycle: "BUILDING",
                paused: false,
                archived: false,
                closed: false,
                health: "HEALTHY",
                valueStatus: "VALIDATED",
                blockers: [],
                activeExecutions: 1,
                updatedAt: "2026-01-01",
              },
              {
                ventureId: "v-2",
                name: "CREATORPULSE",
                slug: "creatorpulse",
                priority: "LOW",
                lifecycle: "PAUSED",
                paused: true,
                archived: false,
                closed: false,
                health: "AT_RISK",
                valueStatus: "UNKNOWN",
                blockers: ["waiting approval"],
                activeExecutions: 0,
                updatedAt: "2026-01-01",
              },
            ],
            allocations: [],
            capacity: [],
            sharedAssets: [],
            risks: [],
            decisions: [],
            activity: [{ id: "a-1", at: "2026-01-01", type: "x", label: "Portfolio created" }],
          },
        },
      },
      {
        missions: [{ id: "m-1", ventureId: "v-1" }],
        previews: [{ id: "p-1", missionId: "m-1", previewUrl: "https://preview.example" }],
      },
    );

    const model = buildPortfolioCommandCenterReadModel({ portfolioId: "pf-1", page: 1, pageSize: 1 });
    expect(model).not.toBeNull();
    expect(model?.ventures).toHaveLength(1);
    expect(model?.pagination.total).toBe(2);
    expect(model?.quickView.totalVentures).toBe(2);
  });
});
