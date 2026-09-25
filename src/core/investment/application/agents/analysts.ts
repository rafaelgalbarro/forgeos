import type { InvestmentAgent, InvestmentAnalysisContext } from "../../domain/types";
import { createResult } from "./base";

export class MacroAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Macro Analyst",
      context.signals.macro,
      "Assesses policy cycle, growth, and inflation regime impacts on expected returns.",
      ["macro-regime-model", "rates-and-inflation-curve"],
    );
  }
}

export class FundamentalAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Fundamental Analyst",
      context.signals.fundamental,
      "Evaluates valuation quality, balance sheet resilience, and earnings durability.",
      ["financial-statements", "valuation-framework"],
    );
  }
}

export class TechnicalAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Technical Analyst",
      context.signals.technical,
      "Analyzes trend persistence, momentum shifts, and support/resistance behavior.",
      ["price-series", "momentum-indicators"],
    );
  }
}

export class QuantAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Quant Analyst",
      context.signals.quant,
      "Uses factor signals and historical distributions to estimate edge consistency.",
      ["factor-model", "historical-backtest-bucket"],
    );
  }
}

export class NewsAnalyst implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "News Analyst",
      context.signals.news,
      "Aggregates event flow sentiment and detects narrative acceleration or decay.",
      ["news-sentiment-feed", "event-impact-catalog"],
    );
  }
}

export class RiskManager implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Risk Manager",
      context.signals.risk,
      "Scores downside asymmetry, volatility pressure, and risk-budget compatibility.",
      ["risk-limits", "volatility-scenarios"],
    );
  }
}

export class PortfolioManager implements InvestmentAgent {
  analyze(context: InvestmentAnalysisContext) {
    return createResult(
      "Portfolio Manager",
      context.signals.portfolioFit,
      "Measures diversification impact and fit with portfolio construction constraints.",
      ["portfolio-exposure-map", "allocation-policy"],
    );
  }
}
