import { describe, expect, it } from "vitest";

describe("investment opportunities route", () => {
  it("exports opportunities page", async () => {
    const page = await import("@/app/investment/opportunities/page");
    expect(typeof page.default).toBe("function");
  }, 30_000);

  it("API route stays analysis-only and returns Opportunity Center shape", async () => {
    const route = await import("@/app/api/investment/opportunities/route");
    expect(typeof route.GET).toBe("function");
    const response = await route.GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("ANALYSIS_ONLY");
    expect(body.orderExecution).toBe("disabled");
    expect(body.liveTradingEnabled).toBe(false);
    expect(Array.isArray(body.candidates)).toBe(true);
    expect(Array.isArray(body.opportunities)).toBe(true);
    expect(typeof body.count).toBe("number");
    expect(body.count).toBe(body.opportunities.length);
    expect(body.qualityFilter?.grades).toEqual(["A+", "A"]);
    expect(body.badges).toEqual(expect.arrayContaining(["ANALYSIS_ONLY", "no-orders", "A+/A-only"]));
    expect(body.fieldWiring?.probabilidad).toBe("NO_DATA");
    expect(body.fieldWiring?.capitalRecomendado).toBe("NO_DATA");
    expect(body.fieldWiring?.volatilidad).toBe("NO_DATA");

    for (const opp of body.opportunities) {
      expect(["A+", "A"]).toContain(opp.grade);
      expect(opp.analysisOnly).toBe(true);
      expect(opp.orderExecution).toBe("disabled");
      expect(["BUY", "SELL", "HOLD"]).toContain(opp.side);
      expect(opp.researchHref).toBe(
        `/investment/research?symbol=${encodeURIComponent(String(opp.activo).trim().toUpperCase())}`,
      );
      expect(opp.probabilidad).toBe("NO_DATA");
      expect(opp.capitalRecomendado).toBe("NO_DATA");
      expect(opp.volatilidad).toBe("NO_DATA");
      expect(Array.isArray(opp.details)).toBe(true);
      const titles = opp.details.map((d: { title: string }) => d.title);
      expect(titles).toEqual(
        expect.arrayContaining([
          "Resumen ejecutivo",
          "Análisis técnico",
          "Análisis fundamental",
          "Análisis macro",
          "Análisis cuantitativo",
          "Noticias",
          "Sentimiento",
          "Comité IA",
          "Consenso",
          "Minority report",
        ]),
      );
    }
  }, 60_000);
});
