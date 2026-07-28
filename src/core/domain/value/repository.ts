/**
 * Value engine repository ports — PROGRAM 6120.
 * Implementations live in application/composition, not domain.
 */

import type { VentureId } from "../shared/ids";
import type {
  CustomerEvidence,
  ValueAssessment,
  ValueEvidence,
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
} from "./entities";

export type ValueEngineRepository = Readonly<{
  hypotheses: {
    save(h: ValueHypothesis): Promise<void>;
    getById(id: string): Promise<ValueHypothesis | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueHypothesis[]>;
  };
  evidence: {
    save(e: ValueEvidence): Promise<void>;
    getById(id: string): Promise<ValueEvidence | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueEvidence[]>;
  };
  metrics: {
    save(m: ValueMetric): Promise<void>;
    getById(id: string): Promise<ValueMetric | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueMetric[]>;
  };
  milestones: {
    save(m: ValueMilestone): Promise<void>;
    getById(id: string): Promise<ValueMilestone | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueMilestone[]>;
  };
  experiments: {
    save(e: ValueExperiment): Promise<void>;
    getById(id: string): Promise<ValueExperiment | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueExperiment[]>;
  };
  assessments: {
    save(a: ValueAssessment): Promise<void>;
    getById(id: string): Promise<ValueAssessment | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueAssessment[]>;
  };
  risks: {
    save(r: ValueRisk): Promise<void>;
    listByVenture(ventureId: VentureId | string): Promise<ValueRisk[]>;
  };
  opportunities: {
    save(o: ValueOpportunity): Promise<void>;
    listByVenture(ventureId: VentureId | string): Promise<ValueOpportunity[]>;
  };
  recommendations: {
    save(r: ValueRecommendation): Promise<void>;
    getById(id: string): Promise<ValueRecommendation | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueRecommendation[]>;
  };
  snapshots: {
    save(s: ValueSnapshot): Promise<void>;
    getById(id: string): Promise<ValueSnapshot | null>;
    listByVenture(ventureId: VentureId | string): Promise<ValueSnapshot[]>;
  };
  economics: {
    save(e: VentureEconomics): Promise<void>;
    getByVenture(ventureId: VentureId | string): Promise<VentureEconomics | null>;
  };
  traction: {
    save(t: VentureTraction): Promise<void>;
    getByVenture(ventureId: VentureId | string): Promise<VentureTraction | null>;
  };
  customerEvidence: {
    save(c: CustomerEvidence): Promise<void>;
    listByVenture(ventureId: VentureId | string): Promise<CustomerEvidence[]>;
  };
}>;
