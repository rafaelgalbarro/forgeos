import type { VentureProject } from "@/lib/domain/venture";
import type {
  Decision,
  Insight,
  PortfolioMemory,
  VentureMemoryRecord,
} from "../types";

function insight(
  text: string,
  category: Insight["category"],
  confidence: number
): Insight {
  return {
    id: crypto.randomUUID(),
    text,
    category,
    confidence,
    generatedAt: new Date().toISOString(),
  };
}

export function generateInsights(
  portfolioMemory: PortfolioMemory,
  ventures: VentureProject[],
  _memories: VentureMemoryRecord[],
  _decisions: Decision[]
): Insight[] {
  const insights: Insight[] = [];
  const total = ventures.length;
  if (total === 0) return insights;

  const saasCount = ventures.filter((v) => {
    const model = v.intelligenceReport?.recommendedBusinessModel ?? "";
    return /saas|suscripción|subscription/i.test(model);
  }).length;
  if (saasCount > 0) {
    const pct = Math.round((saasCount / total) * 100);
    insights.push(
      insight(`${pct}% de ventures usan o recomiendan SaaS`, "business_model", 0.8)
    );
  }

  const withFullDiscovery = ventures.filter(
    (v) => (v.discoveryContext?.answers.length ?? 0) >= 3
  );
  const withPartialDiscovery = ventures.filter((v) => {
    const c = v.discoveryContext?.answers.length ?? 0;
    return c > 0 && c < 3;
  });

  if (withFullDiscovery.length > 0) {
    const fullScores = withFullDiscovery
      .map((v) => v.ventureSimulatorResult?.startupScore)
      .filter((s): s is number => s !== undefined);
    const partialScores = withPartialDiscovery
      .map((v) => v.ventureSimulatorResult?.startupScore)
      .filter((s): s is number => s !== undefined);

    if (fullScores.length > 0 && partialScores.length > 0) {
      const avgFull = fullScores.reduce((a, b) => a + b, 0) / fullScores.length;
      const avgPartial = partialScores.reduce((a, b) => a + b, 0) / partialScores.length;
      if (avgFull > avgPartial) {
        insights.push(
          insight(
            "Discovery completo correlaciona con mejores scores de simulador",
            "discovery",
            0.75
          )
        );
      }
    }
  }

  const b2bVentures = ventures.filter((v) =>
    /b2b|empresa|enterprise|negocio/i.test(
      `${v.targetAudience} ${v.ideaText} ${v.discoveryContext?.inferredProductType ?? ""}`
    )
  );
  if (b2bVentures.length > 0) {
    const b2bWithLowRisk = b2bVentures.filter((v) => {
      const risks = v.ventureSimulatorResult?.risks ?? [];
      return risks.length <= 2;
    });
    if (b2bWithLowRisk.length / b2bVentures.length > 0.5) {
      insights.push(insight("B2B tiende a menor riesgo percibido en el portfolio", "risk", 0.65));
    }
  }

  for (const pattern of portfolioMemory.patterns) {
    if (pattern.type === "build_delay") {
      insights.push(
        insight(
          `Retraso detectado: ${pattern.description}`,
          "portfolio",
          pattern.confidence
        )
      );
    }
    if (pattern.type === "incomplete_discovery") {
      insights.push(
        insight(pattern.description, "discovery", pattern.confidence)
      );
    }
  }

  const simVentures = ventures.filter((v) => v.ventureSimulatorResult);
  if (simVentures.length >= 2) {
    const buildRecs = simVentures.filter(
      (v) =>
        v.ventureSimulatorResult?.recommendation === "build" ||
        v.ventureSimulatorResult?.recommendation === "build_small_mvp"
    );
    if (buildRecs.length / simVentures.length >= 0.5) {
      insights.push(
        insight(
          `${Math.round((buildRecs.length / simVentures.length) * 100)}% de ventures simulados recomiendan build`,
          "simulator",
          0.7
        )
      );
    }
  }

  return insights;
}

export function getInsightsForVenture(
  ventureId: string,
  portfolioMemory: PortfolioMemory | null
): Insight[] {
  if (!portfolioMemory) return [];
  return portfolioMemory.insights.filter((i) =>
    portfolioMemory.patterns.some(
      (p) => p.ventureIds.includes(ventureId) && i.text.includes(p.description.split(":")[0] ?? "")
    )
  ).length > 0
    ? portfolioMemory.insights
    : portfolioMemory.insights.slice(0, 5);
}
