# Epic 6.6 — QA Factory

## Goal

QA Factory consumes Build Context, Build DNA, and Build Registry to generate **planning artifacts** for quality assurance.  
It does **not** run tests or generate final test code.

## Module

`lib/build-platform/qa-factory/`

Main responsibilities:

- Build unified QA blueprint metadata
- Generate test plan with coverage targets and CI gates
- Plan Playwright E2E scenarios
- Define unit test cases and mock strategy
- Define integration test cases and fixtures
- Plan accessibility checkpoints (WCAG)
- Set performance budgets per route
- Plan security test cases and compliance checks
- Define regression suites and baseline strategy
- Validate blueprint completeness

## Inputs

- `build-context` via direct import from `lib/build-platform/build-context`
- `build-dna` via direct import from `lib/build-platform/build-dna`
- `build-registry` via direct import from `lib/build-platform/build-registry`

When upstream APIs are partial, lab harness normalizes data through adapters.

## Outputs

`QaBlueprint` includes:

- `testPlan` — objectives, suites, coverage targets, CI gates
- `playwright` — E2E scenarios, browsers, config path
- `unitTests` — test cases, framework, mock strategy
- `integrationTests` — API test cases, fixtures
- `accessibility` — WCAG checkpoints, scan routes
- `performance` — Lighthouse scenarios and budgets
- `security` — scan tools, test cases, compliance checks
- `regression` — suites by trigger (PR, release, nightly)
- `validation`

## Lab

Route: `/lab/qa-factory`

Files:

- `app/lab/qa-factory/page.tsx`
- `components/lab/QaFactoryLab.tsx`
- `lib/lab/qa-factory-lab.ts`

Action button: **Generar QA Blueprint**

The lab renders all blueprint sections for review using FHIS components.
