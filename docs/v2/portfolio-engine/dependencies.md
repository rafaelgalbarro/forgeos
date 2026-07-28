# Venture Dependencies — Program 6110

Types: `TECHNICAL`, `COMMERCIAL`, `DATA`, `BRAND`, `INFRASTRUCTURE`, `FINANCIAL`, `OPERATIONAL`

Detection:
- Circular dependencies → rejected at `addDependency()`
- Unapproved dependencies → flagged in `PortfolioRiskProjection`
- Provider closure risk → CRITICAL risk when target venture is closed
