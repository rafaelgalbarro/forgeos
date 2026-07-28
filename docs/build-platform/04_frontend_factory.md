# Epic 6.3 — Frontend Factory

## Goal

Frontend Factory consumes Build Context, Build DNA, and Build Registry to generate **planning artifacts** for frontend implementation.  
It does **not** generate final runtime code.

## Module

`lib/build-platform/frontend-factory/`

Main responsibilities:

- Build unified frontend blueprint metadata
- Plan app structure and route map
- Define layout shells
- Map FHIS component usage
- Generate page, navigation, form, dashboard, and widget specs
- Validate blueprint completeness

## Inputs

- `build-context` via direct import from `lib/build-platform/build-context`
- `build-dna` via direct import from `lib/build-platform/build-dna`
- `build-registry` via direct import from `lib/build-platform/build-registry`

When upstream APIs are partial, lab harness normalizes data through adapters.

## Outputs

`FrontendBlueprint` includes:

- `appStructure`
- `routes`
- `layouts`
- `components` (FHIS mappings)
- `pages`
- `navigation`
- `forms`
- `dashboards`
- `widgets`
- `validation`

## Lab

Route: `/lab/frontend-factory`

Files:

- `app/lab/frontend-factory/page.tsx`
- `components/lab/FrontendFactoryLab.tsx`
- `lib/lab/frontend-factory-lab.ts`

Action button: **Generar Frontend Blueprint**

The lab renders all blueprint sections for review using FHIS components.
