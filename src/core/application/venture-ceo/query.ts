import { getCompositionRoot } from "../../composition/root";
import { seedRafaelVenturesLabValueEngine } from "../value-engine/fixture-rafael-ventures-lab";
import type { CEOReadSources } from "../../domain/venture-ceo";

export async function getCEOSourcesForPortfolio(portfolioId: string): Promise<CEOReadSources | null> {
  const root = getCompositionRoot();
  const portfolioMeta = root.store.meta.portfolio6150 as
    | { portfolioId: string; readModel: CEOReadSources["portfolio"] }
    | undefined;
  const fromMeta =
    portfolioMeta && portfolioMeta.portfolioId === portfolioId ? portfolioMeta.readModel : undefined;

  const readModel = fromMeta;
  if (!readModel) return null;

  const seeded = await seedRafaelVenturesLabValueEngine();
  const valueSnapshots = await Promise.all(
    readModel.ventures.map(async (v) => {
      const snaps = await seeded.store.snapshots.listByVenture(v.ventureId);
      const latest = snaps.at(-1);
      return {
        ventureId: v.ventureId,
        stage: latest?.props.stage,
        confidence: latest ? Number(latest.props.confidence) : 0,
        missingEvidence: latest?.props.dimensions.flatMap((d) => d.missingEvidence) ?? [],
      };
    }),
  );
  const evidence = (
    await Promise.all(
      readModel.ventures.map((v) => seeded.store.evidence.listByVenture(v.ventureId)),
    )
  ).flat();
  const economics = await Promise.all(
    readModel.ventures.map(async (v) => {
      const econ = await seeded.store.economics.getByVenture(v.ventureId);
      return { ventureId: v.ventureId, hasActualRevenue: econ?.props.actualRevenue?.valueType === "ACTUAL" };
    }),
  );

  return {
    portfolio: readModel,
    valueSnapshots,
    evidence: evidence.map((e) => ({ ventureId: String(e.props.ventureId), summary: e.props.summary, type: e.props.type })),
    economics,
    resourceAllocations: readModel.allocations.map((a) => ({
      ventureId: a.ventureId,
      available: a.available,
      resourceType: a.resourceType,
    })),
    activeExecutions: readModel.ventures.map((v) => ({ ventureId: v.ventureId, count: v.activeExecutions })),
    risks: readModel.risks.map((r) => ({ ventureId: r.ventureId, severity: r.severity, message: r.message })),
    blockers: readModel.ventures.flatMap((v) => v.blockers.map((b) => ({ ventureId: v.ventureId, message: b }))),
    approvals: [],
    policies: readModel.policies.map((p) => ({ kind: p.kind, enabled: p.enabled, config: p.config })),
    dependencies: readModel.dependencies.map((d) => ({
      sourceVentureId: d.sourceVentureId,
      targetVentureId: d.targetVentureId,
      approved: d.approved,
    })),
    activity: readModel.activity,
  };
}

