# Validation

`response-validator.ts` validates minimum fields:

**CEO:** summary, priority, risks, recommendation, expectedImpact

**Board:** member, position, argumentsFor/Against, risks, vote, confidence

**Build:** summary, architecture, modules, steps, risks, nextActions

On failure: mock fallback if allowed + warning (flow continues).
