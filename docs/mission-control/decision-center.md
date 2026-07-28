# Decision Center

Location: `lib/mission-control/decision-center.ts`  
UI: `components/mission-control/DecisionCenterPanel.tsx`

## Decision categories

- PRICING
- BRANDING
- DOMAIN
- ARCHITECTURE
- DEPLOYMENT

## Flow

1. `seedDecisionsForIntention()` adds relevant pending decisions when factory flow starts
2. Conversation engine surfaces **one decision at a time** via `formatDecisionPrompt()`
3. User resolves via conversation (number/text) or checkbox in Decision Center panel
4. **Auto-pilot** auto-resolves non-important decisions with first option

## Important vs routine

| Important | Auto-resolvable |
|-----------|-----------------|
| Branding | Pricing (if auto-pilot on) |
| Architecture | Domain |
| | Deployment env |

When auto-pilot is off, every pending decision pauses for user approval.
