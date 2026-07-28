/**
 * In-memory ValueEngineRepository — PROGRAM 6120.
 */

import type {
  CustomerEvidence,
  ValueAssessment,
  ValueEvidence,
  ValueEngineRepository,
  ValueExperiment,
  ValueHypothesis,
  ValueMetric,
  ValueMilestone,
  ValueOpportunity,
  ValueRecommendation,
  ValueRisk,
  ValueSnapshot,
  VentureEconomics,
  VentureTraction,
} from "@/src/core/domain";

function mapByVenture<T extends { props: { ventureId: string } }>(
  store: Map<string, T>,
  ventureId: string
): T[] {
  return [...store.values()].filter((x) => String(x.props.ventureId) === String(ventureId));
}

export function createInMemoryValueStore(): ValueEngineRepository & {
  clear(): void;
} {
  const hypotheses = new Map<string, ValueHypothesis>();
  const evidence = new Map<string, ValueEvidence>();
  const metrics = new Map<string, ValueMetric>();
  const milestones = new Map<string, ValueMilestone>();
  const experiments = new Map<string, ValueExperiment>();
  const assessments = new Map<string, ValueAssessment>();
  const risks = new Map<string, ValueRisk>();
  const opportunities = new Map<string, ValueOpportunity>();
  const recommendations = new Map<string, ValueRecommendation>();
  const snapshots = new Map<string, ValueSnapshot>();
  const economics = new Map<string, VentureEconomics>();
  const traction = new Map<string, VentureTraction>();
  const customerEvidence = new Map<string, CustomerEvidence>();

  return {
    hypotheses: {
      async save(h) {
        hypotheses.set(String(h.id), h);
      },
      async getById(id) {
        return hypotheses.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(hypotheses, String(ventureId));
      },
    },
    evidence: {
      async save(e) {
        evidence.set(String(e.id), e);
      },
      async getById(id) {
        return evidence.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(evidence, String(ventureId));
      },
    },
    metrics: {
      async save(m) {
        metrics.set(String(m.id), m);
      },
      async getById(id) {
        return metrics.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(metrics, String(ventureId));
      },
    },
    milestones: {
      async save(m) {
        milestones.set(String(m.id), m);
      },
      async getById(id) {
        return milestones.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(milestones, String(ventureId));
      },
    },
    experiments: {
      async save(e) {
        experiments.set(String(e.id), e);
      },
      async getById(id) {
        return experiments.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(experiments, String(ventureId));
      },
    },
    assessments: {
      async save(a) {
        assessments.set(String(a.id), a);
      },
      async getById(id) {
        return assessments.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(assessments, String(ventureId));
      },
    },
    risks: {
      async save(r) {
        risks.set(String(r.id), r);
      },
      async listByVenture(ventureId) {
        return mapByVenture(risks, String(ventureId));
      },
    },
    opportunities: {
      async save(o) {
        opportunities.set(String(o.id), o);
      },
      async listByVenture(ventureId) {
        return mapByVenture(opportunities, String(ventureId));
      },
    },
    recommendations: {
      async save(r) {
        recommendations.set(String(r.id), r);
      },
      async getById(id) {
        return recommendations.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(recommendations, String(ventureId));
      },
    },
    snapshots: {
      async save(s) {
        snapshots.set(String(s.id), s);
      },
      async getById(id) {
        return snapshots.get(id) ?? null;
      },
      async listByVenture(ventureId) {
        return mapByVenture(snapshots, String(ventureId));
      },
    },
    economics: {
      async save(e) {
        economics.set(String(e.props.ventureId), e);
      },
      async getByVenture(ventureId) {
        return economics.get(String(ventureId)) ?? null;
      },
    },
    traction: {
      async save(t) {
        traction.set(String(t.props.ventureId), t);
      },
      async getByVenture(ventureId) {
        return traction.get(String(ventureId)) ?? null;
      },
    },
    customerEvidence: {
      async save(c) {
        customerEvidence.set(String(c.id), c);
      },
      async listByVenture(ventureId) {
        return mapByVenture(customerEvidence, String(ventureId));
      },
    },
    clear() {
      hypotheses.clear();
      evidence.clear();
      metrics.clear();
      milestones.clear();
      experiments.clear();
      assessments.clear();
      risks.clear();
      opportunities.clear();
      recommendations.clear();
      snapshots.clear();
      economics.clear();
      traction.clear();
      customerEvidence.clear();
    },
  };
}
