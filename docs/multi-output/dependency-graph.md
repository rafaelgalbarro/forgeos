# Dependency Graph

Single source of truth in `lib/multi-output/output-dependency-graph.ts`.

## Official Chains

### Product Chain
```
Company DNA (VENTURE) → Brand → Website → App UI → Mobile UI
```

### Technical Chain
```
PRD (VENTURE) → Architecture → Backend → API → Web/Mobile
```

### Build Context
```
Build Context → Website, Web App, Mobile (technical outputs)
```

### Pricing
```
Pricing (VENTURE) → Website + App + Financial + Investor Deck
```

## Rules

- No stage starts without satisfied dependencies
- Brand unapproved blocks Website UI + App UI + Mobile UI
- Parallel only when `canRunInParallel()` returns true
- Topological sort determines generation order

## Functions

- `getDependenciesFor(kind)` — direct upstream deps
- `getTransitiveDependents(kind)` — all downstream affected by change
- `topologicalSort(kinds)` — generation order
- `canRunInParallel(a, b)` — parallel safety check
