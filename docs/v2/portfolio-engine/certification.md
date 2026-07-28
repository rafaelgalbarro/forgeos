# Certification — RAFAEL VENTURES LAB

Fixture: `src/core/composition/fixtures/rafael-ventures-lab.ts`

## Ventures

1. **ORBITA SPORTS** — SaaS sports centers (CRITICAL, BUILDING)
2. **TABLEFLOW** — Restaurant OS (HIGH, OPERATING)
3. **LUXORA EYEWEAR** — Premium eyewear (NORMAL, PLANNING)
4. **LOCALGROW AI** — Local business automation (LOW, VALIDATING)
5. **CREATORPULSE** — Creator monetization (NORMAL, DISCOVERING) — paused + controlled failure

## Scenario

- 5 ventures created via `CreateVentureBatch`
- 3 active, 1 paused, 1 validating
- Different priorities
- Limited resources (workspace limits)
- One shared dependency (TABLEFLOW → ORBITA SPORTS)
- One controlled failure (CREATORPULSE AI timeout)
- Failure isolation: ORBITA SPORTS execution still accepted

Test: `src/core/application/portfolio/__tests__/portfolio-engine.test.ts`
