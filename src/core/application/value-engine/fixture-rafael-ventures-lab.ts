import { RAFAEL_VENTURES_LAB_VALUE_FIXTURE } from "@/src/core/composition/fixtures/rafael-ventures-lab";
import { ValueEngineService } from "./service";

/**
 * Seed helper used by internal queries/certification.
 * Adds only declared evidence facts; never invents revenue/customers.
 */
export async function seedRafaelVenturesLabValueEngine(service: ValueEngineService) {
  for (const venture of RAFAEL_VENTURES_LAB_VALUE_FIXTURE.ventures) {
    for (const evidenceType of venture.knownFacts.evidence) {
      await service.registerValueEvidence({
        ventureId: venture.id,
        type: evidenceType as never,
        source: `${venture.id}-fixture-source`,
        provenance: `fixture://${venture.id}/${evidenceType.toLowerCase()}`,
        summary: `Fixture evidence for ${venture.name}: ${evidenceType}`,
      });
    }
    await service.createValueAssessment({
      ventureId: venture.id,
      stage: venture.stageHint as never,
      includeOptionalScore: true,
    });
    await service.requestValueReview({ ventureId: venture.id });
  }
}

/**
 * RAFAEL VENTURES LAB — Program 6120 certification fixture (extends 6110 portfolio concept).
 *
 * Rules:
 * - NO invented revenue, customers, or metrics
 * - Only register evidence that matches each venture's declared profile
 * - Currency comes from venture config (not assumed EUR)
 */

import {
  ValueOpportunity,
  ValueRisk,
  asVentureId,
  Confidence,
  nowTimestamp,
  type ValueEngineRepository,
} from "@/src/core/domain";
import { createValueEngine, type ValueEngine } from "./engine";
import { createInMemoryValueStore } from "./store";

export const RAFAEL_VENTURES_LAB_PORTFOLIO_ID = "rafael-ventures-lab";

export const RAFAEL_VENTURES_LAB = {
  portfolioId: RAFAEL_VENTURES_LAB_PORTFOLIO_ID,
  portfolioName: "RAFAEL VENTURES LAB",
  ventures: [
    {
      id: "rvl-orbita-sports",
      name: "ORBITA SPORTS",
      currency: "EUR",
      stage: "IDEA_VALUE" as const,
      profile: "strong_opportunity_no_validation",
      idea: "Sports club operating system",
    },
    {
      id: "rvl-tableflow",
      name: "TABLEFLOW",
      currency: "USD",
      stage: "PROBLEM_VALIDATION" as const,
      profile: "customer_interviews",
      idea: "Restaurant table & floor operations flow",
    },
    {
      id: "rvl-luxora-eyewear",
      name: "LUXORA EYEWEAR",
      currency: "EUR",
      stage: "MARKET_VALIDATION" as const,
      profile: "landing_and_signups",
      idea: "Premium eyewear D2C landing validation",
    },
    {
      id: "rvl-localgrow-ai",
      name: "LOCALGROW AI",
      currency: "USD",
      stage: "PRODUCT_VALIDATION" as const,
      profile: "pilot",
      idea: "Local business growth AI assistant",
    },
    {
      id: "rvl-creatorpulse",
      name: "CREATORPULSE",
      currency: "USD",
      stage: "IDEA_VALUE" as const,
      profile: "blocked_lack_of_evidence",
      idea: "Creator analytics pulse — evidence gap",
    },
  ],
} as const;

export type SeededRafaelVenturesLab = Readonly<{
  engine: ValueEngine;
  store: ValueEngineRepository & { clear(): void };
  ventureIds: readonly string[];
}>;

/**
 * Seeds certification state for the five RVL ventures.
 * Intentionally does NOT create ACTUAL revenue for any venture.
 */
export async function seedRafaelVenturesLabValueEngine(
  store = createInMemoryValueStore()
): Promise<SeededRafaelVenturesLab> {
  const engine = createValueEngine(store);
  const conf = Confidence(0.5);
  if (!conf.ok) throw new Error(conf.error.message);
  const ts = nowTimestamp();

  for (const v of RAFAEL_VENTURES_LAB.ventures) {
    await engine.registerVenture({
      ventureId: v.id,
      name: v.name,
      currency: v.currency,
      stage: v.stage,
    });
  }

  // ── ORBITA SPORTS: strong opportunity, no validation ───────────────────────
  {
    const vid = "rvl-orbita-sports";
    const opp = ValueOpportunity.create({
      id: "opp-orbita-1",
      ventureId: asVentureId(vid),
      title: "Club ops software gap",
      description:
        "Founder thesis: multi-club sports operators lack unified OS — opportunity hypothesis only",
      magnitude: "HIGH",
      dimension: "MARKET_OPPORTUNITY",
      now: ts,
    });
    if (!opp.ok) throw new Error(opp.error.message);
    await store.opportunities.save(opp.value);

    await engine.CreateValueHypothesis({
      id: "hyp-orbita-1",
      ventureId: vid,
      statement: "Sports clubs will pay for a unified operating system",
      dimension: "MARKET_OPPORTUNITY",
      assumptions: ["Clubs have budget", "Status quo tools are fragmented"],
      invalidationCriteria: ["No clubs confirm the problem in interviews"],
      confidence: 0.3,
    });

    await engine.CreateValueMilestone({
      id: "ms-orbita-interviews",
      ventureId: vid,
      name: "10 customer interviews",
      target: 10,
      current: 0,
      unit: "interviews",
      evidenceRequirements: ["CUSTOMER_INTERVIEW provenance required"],
      owner: "founder",
      costToMilestone: {
        money: { amount: 1500, currency: "EUR" },
        period: "one-time",
        source: "founder estimate — ESTIMATED only",
        valueType: "ESTIMATED",
        confidence: conf.value,
        updatedAt: ts,
      },
    });

    // Explicit UNKNOWN metrics — no invented MRR
    await engine.CreateValueMetric({
      id: "met-orbita-mrr",
      ventureId: vid,
      kind: "MRR",
      label: "MRR",
      valueType: "UNKNOWN",
      source: "not measured — no revenue events",
      currency: "EUR",
    });
  }

  // ── TABLEFLOW: customer interviews ─────────────────────────────────────────
  {
    const vid = "rvl-tableflow";
    await engine.CreateValueHypothesis({
      id: "hyp-tableflow-1",
      ventureId: vid,
      statement: "Restaurant managers lose covers due to floor coordination gaps",
      dimension: "PROBLEM_EVIDENCE",
      confidence: 0.4,
    });

    for (let i = 1; i <= 5; i++) {
      await engine.RegisterValueEvidence({
        id: `ev-tableflow-interview-${i}`,
        ventureId: vid,
        type: "CUSTOMER_INTERVIEW",
        source: `Interview notes TF-2026-0${i} with restaurant manager #${i}`,
        provenance: `rafael-ventures-lab/tableflow/interviews/TF-2026-0${i}.md`,
        summary: `Manager #${i} confirmed floor coordination pain during peak service`,
        relatedHypothesisId: "hyp-tableflow-1",
        reliability: "MEDIUM",
        derivation: "DIRECT",
        attachmentRef: `artifacts/tableflow/interview-${i}`,
      });
    }

    await engine.CreateValueMetric({
      id: "met-tableflow-interviews",
      ventureId: vid,
      kind: "INTERVIEWS_DONE",
      label: "Interviews done",
      valueType: "ACTUAL",
      source: "interview evidence registry",
      numericValue: 5,
      unit: "count",
      confidence: 0.9,
    });

    await engine.CreateValueMetric({
      id: "met-tableflow-problem",
      ventureId: vid,
      kind: "PROBLEM_CONFIRMED",
      label: "Problem confirmed",
      valueType: "ACTUAL",
      source: "coded interview themes",
      numericValue: 4,
      unit: "count",
      confidence: 0.7,
    });

    await engine.CreateValueMilestone({
      id: "ms-tableflow-10",
      ventureId: vid,
      name: "10 customer interviews",
      target: 10,
      current: 5,
      unit: "interviews",
      evidenceRequirements: ["CUSTOMER_INTERVIEW"],
      owner: "validation-lead",
    });

    await engine.CreateValueMetric({
      id: "met-tableflow-mrr",
      ventureId: vid,
      kind: "MRR",
      label: "MRR",
      valueType: "UNKNOWN",
      source: "no paying customers yet",
      currency: "USD",
    });
  }

  // ── LUXORA EYEWEAR: landing and signups ────────────────────────────────────
  {
    const vid = "rvl-luxora-eyewear";
    await engine.RegisterValueEvidence({
      id: "ev-luxora-landing",
      ventureId: vid,
      type: "LANDING_CONVERSION",
      source: "Luxora landing analytics export 2026-06",
      provenance: "rafael-ventures-lab/luxora/landing/analytics-2026-06.csv",
      summary: "Landing published; conversion events recorded from analytics export",
      reliability: "HIGH",
      derivation: "DIRECT",
      artifactRef: "artifacts/luxora/landing-v1",
    });
    await engine.RegisterValueEvidence({
      id: "ev-luxora-waitlist",
      ventureId: vid,
      type: "WAITLIST",
      source: "Waitlist provider export",
      provenance: "rafael-ventures-lab/luxora/waitlist/export-2026-07.csv",
      summary: "128 waitlist signups recorded from provider export (not revenue)",
      reliability: "HIGH",
      derivation: "DIRECT",
    });

    await engine.CreateValueMetric({
      id: "met-luxora-waitlist",
      ventureId: vid,
      kind: "WAITLIST",
      label: "Waitlist signups",
      valueType: "ACTUAL",
      source: "waitlist export",
      numericValue: 128,
      unit: "signups",
      confidence: 0.85,
    });

    await engine.CreateValueMetric({
      id: "met-luxora-conversion",
      ventureId: vid,
      kind: "CONVERSION_RATE",
      label: "Landing conversion rate",
      valueType: "ACTUAL",
      source: "analytics export",
      numericValue: 4.2,
      unit: "percent",
      confidence: 0.8,
    });

    await engine.CreateValueMilestone({
      id: "ms-luxora-100",
      ventureId: vid,
      name: "100 signups",
      target: 100,
      current: 128,
      unit: "signups",
      evidenceRequirements: ["WAITLIST"],
    });

    // TARGET only — not ACTUAL revenue
    await engine.CreateValueMetric({
      id: "met-luxora-mrr-target",
      ventureId: vid,
      kind: "MRR",
      label: "MRR target (not actual)",
      valueType: "TARGET",
      source: "founder planning target — not fact",
      moneyAmount: 1000,
      currency: "EUR",
      period: "month",
      confidence: 0.2,
    });
  }

  // ── LOCALGROW AI: pilot ────────────────────────────────────────────────────
  {
    const vid = "rvl-localgrow-ai";
    await engine.RegisterValueEvidence({
      id: "ev-localgrow-pilot",
      ventureId: vid,
      type: "PILOT",
      source: "Pilot agreement with LocalBiz Co (anonymized)",
      provenance: "rafael-ventures-lab/localgrow/pilots/pilot-001.md",
      summary: "4-week pilot completed with documented usage notes — no payment claimed",
      reliability: "HIGH",
      derivation: "DIRECT",
      artifactRef: "artifacts/localgrow/pilot-001",
    });
    await engine.RegisterValueEvidence({
      id: "ev-localgrow-active",
      ventureId: vid,
      type: "ACTIVE_USER",
      source: "Pilot usage log",
      provenance: "rafael-ventures-lab/localgrow/pilots/usage-log-001.csv",
      summary: "12 active pilot users during trial window",
      reliability: "MEDIUM",
      derivation: "DIRECT",
    });

    await engine.CreateValueMetric({
      id: "met-localgrow-pilots",
      ventureId: vid,
      kind: "PILOTS",
      label: "Pilots",
      valueType: "ACTUAL",
      source: "pilot evidence",
      numericValue: 1,
      unit: "count",
      confidence: 0.9,
    });

    await engine.CreateValueMetric({
      id: "met-localgrow-users",
      ventureId: vid,
      kind: "ACTIVE_USERS",
      label: "Active users (pilot)",
      valueType: "ACTUAL",
      source: "usage log",
      numericValue: 12,
      unit: "users",
      confidence: 0.75,
    });

    await engine.CreateValueMilestone({
      id: "ms-localgrow-first-pilot",
      ventureId: vid,
      name: "First pilot",
      target: 1,
      current: 1,
      unit: "pilots",
      evidenceRequirements: ["PILOT"],
    });

    // PROJECTED only — explicitly not ACTUAL
    await engine.CreateValueMetric({
      id: "met-localgrow-mrr-proj",
      ventureId: vid,
      kind: "MRR",
      label: "MRR projected (scenario)",
      valueType: "PROJECTED",
      source: "scenario model — not observed revenue",
      moneyAmount: 2500,
      currency: "USD",
      period: "month",
      confidence: 0.15,
    });

    const econ = await store.economics.getByVenture(vid);
    if (econ) {
      const updated = econ.withField("projectedRevenue", {
        money: { amount: 2500, currency: "USD" },
        period: "month",
        source: "scenario model — not observed",
        valueType: "PROJECTED",
        confidence: conf.value,
        updatedAt: ts,
      });
      if (updated.ok) await store.economics.save(updated.value);
    }
  }

  // ── CREATORPULSE: blocked by lack of evidence ──────────────────────────────
  {
    const vid = "rvl-creatorpulse";
    const risk = ValueRisk.create({
      id: "risk-creatorpulse-1",
      ventureId: asVentureId(vid),
      title: "No evidence base",
      description:
        "Venture has deliverable activity history in portfolio notes but zero registered value evidence — blocked for validation claims",
      severity: "HIGH",
      dimension: "RISK",
      mitigation: "Register interviews or research before further build investment",
      now: ts,
    });
    if (!risk.ok) throw new Error(risk.error.message);
    await store.risks.save(risk.value);

    await engine.CreateValueHypothesis({
      id: "hyp-creatorpulse-1",
      ventureId: vid,
      statement: "Creators will pay for pulse analytics",
      dimension: "CUSTOMER_EVIDENCE",
      confidence: 0.15,
    });

    await engine.CreateValueMilestone({
      id: "ms-creatorpulse-blocked",
      ventureId: vid,
      name: "5 confirmed problems",
      target: 5,
      current: 0,
      unit: "confirmations",
      evidenceRequirements: ["CUSTOMER_INTERVIEW"],
      owner: "unassigned",
    });
    const ms = await store.milestones.getById("ms-creatorpulse-blocked");
    if (ms) {
      await store.milestones.save(ms.block("Blocked by lack of evidence"));
    }

    await engine.CreateValueMetric({
      id: "met-creatorpulse-mrr",
      ventureId: vid,
      kind: "MRR",
      label: "MRR",
      valueType: "UNKNOWN",
      source: "no evidence — UNKNOWN",
      currency: "USD",
    });
  }

  // Run reviews so assessments + recommendations exist for certification
  for (const v of RAFAEL_VENTURES_LAB.ventures) {
    await engine.RequestValueReview({ ventureId: v.id });
    await engine.CreateValueSnapshot({
      id: `snap-${v.id}-t0`,
      ventureId: v.id,
    });
  }

  return {
    engine,
    store,
    ventureIds: RAFAEL_VENTURES_LAB.ventures.map((v) => v.id),
  };
}
