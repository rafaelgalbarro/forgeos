# Test Cases — Pair Founder Heuristic Handlers

## A. Low price + high profitability

**Input example**: "Quiero precio gratis pero margen del 70%"

**Handler**: `detectPricingProfitabilityConflict()` in `contradiction-detector.ts`

**Behavior**:
- Detects tension between low-price patterns and high-profitability patterns
- Surfaces impact: unit economics inviable without volume
- Proposes alternative: freemium + premium tier or adjust margin expectation
- Requires decision before advancing

## B. 2-week launch + complex enterprise app

**Input example**: "Lanzar en 2 semanas una app enterprise multi-tenant con SSO"

**Handler**: `detectTimelineComplexityConflict()`

**Behavior**:
- Severity: critical
- Impact: technical debt, production bugs, burnout
- Alternative: simplified B2B MVP in 2 weeks OR 3–6 month timeline

## C. Target customer change mid-mission

**Input example**: (after B2B decisions) "Mejor apuntemos a consumidores B2C"

**Handler**: `detectCustomerChangeConflict()`

**Behavior**:
- Triggers context change flow via `detectContextChange()`
- Marks affected artifacts: icp, pricing, gtm, value_prop
- Recalculates dependencies without regenerating entire plan
- CEO explains what changes in reply

## D. 70% budget cut

**Input example**: "Recortar presupuesto un 70%"

**Handler**: `detectBudgetCutConflict()`

**Behavior**:
- Identifies scope vs resources mismatch
- Proposes: prioritize MVP, postpone mobile/GTM
- Updates mission status markers with `[Context]` prefix
- Asks which deliverables are essential vs deferrable

## E. User rejects CEO recommendation

**Input example**: "No estoy de acuerdo con esa recomendación"

**Handler**: `detectRecommendationRejection()`

**Behavior**:
- Maintains coherence with user's choice
- Does not re-propose rejected action
- Offers alternative aligned with user preference
- Asks what direction they prefer instead

## Verification

Run these inputs in Mission Control conversation after initial message to confirm contradictions appear in CEO Insights panel and CEO reply includes impact + alternative.
