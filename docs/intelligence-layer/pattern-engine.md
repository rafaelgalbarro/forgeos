# Pattern Engine

Heuristic pattern detection across the venture portfolio. No ML — rule-based string matching and date arithmetic.

## Patterns

| Type | Detection Rule |
|------|----------------|
| `saas_preference` | Business model or category mentions SaaS/subscription |
| `stripe_pricing` | Pricing section or monetization hints mention Stripe |
| `marketplace_preference` | Idea/model mentions marketplace/platform |
| `build_delay` | >14 days since creation without engineering sections |
| `incomplete_discovery` | <2 discovery answers + simulator score <55 |

## API

- `detectPatterns(ventures)` — run all heuristics, cache to `forgeos-intelligence-patterns`
- `getCachedPatterns()` — read cache
- `getPatternsForVenture(ventureId)` — filter by venture

## Confidence

Each pattern carries a `confidence` score (0–1) based on match strength and portfolio ratio.

## Cache

Patterns are recomputed when `buildPortfolioMemory` runs or when the Memoria panel mounts (via portfolio rebuild).
