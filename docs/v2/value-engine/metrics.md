# Value Metrics

Supported kinds include interviews, problem confirmed, purchase intent, waitlist, conversion rate, demos, pilots, active users, paying customers, MRR, ARR, churn, retention, CAC, LTV, gross margin, burn, runway, payback, activation, engagement, NPS, time to value, operating cost.

## Value types (mandatory)

| Type | Meaning |
|------|---------|
| `ACTUAL` | Observed fact with source |
| `ESTIMATED` | Human estimate |
| `PROJECTED` | Forward model |
| `TARGET` | Goal, not fact |
| `UNKNOWN` | Not measured — **no numeric payload allowed** |

Commands: `CreateValueMetric`, `UpdateValueMetric`.
