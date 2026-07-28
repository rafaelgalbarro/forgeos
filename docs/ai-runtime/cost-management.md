# Cost Management

- Monthly budget: `AI_MONTHLY_BUDGET_USD` (default 100)
- Cost optimizer: `ENABLE_COST_OPTIMIZER=true`
- Per-model pricing in model registry
- Router v2 tracks `budgetRemaining` per decision

## Best Practices

1. Keep `ENABLE_REAL_AI=false` in development
2. Use `optimizer: "cost"` for high-volume tasks
3. Local providers (Ollama, LM Studio) have zero cost
