# Epic 6.5 — Database Factory

## Goal

Database Factory consumes Build Context, Build DNA, and Build Registry to generate **planning artifacts** for database implementation.  
It does **not** create live database connections or deploy to Supabase.

## Module

`lib/build-platform/database-factory/`

Main responsibilities:

- Build unified database blueprint metadata
- Plan entities (tables and columns)
- Define relations and foreign keys
- Specify indexes for tenant and query patterns
- Generate RLS/auth policy specs
- Produce migration specs (up/down SQL steps)
- Define seed data for dev/staging
- Document constraints and optimization recommendations
- Validate blueprint completeness

## Inputs

- `build-context` via direct import from `lib/build-platform/build-context`
- `build-dna` via direct import from `lib/build-platform/build-dna`
- `build-registry` via direct import from `lib/build-platform/build-registry`

When upstream APIs are partial, lab harness normalizes data through adapters.

## Outputs

`DatabaseBlueprint` includes:

- `entities`
- `relations`
- `indexes`
- `policies`
- `migrations`
- `seeds`
- `constraints`
- `optimization`
- `validation`

## Lab

Route: `/lab/database-factory`

Files:

- `app/lab/database-factory/page.tsx`
- `components/lab/DatabaseFactoryLab.tsx`
- `lib/lab/database-factory-lab.ts`

Action button: **Generar Database Blueprint**

The lab renders all blueprint sections for review using FHIS components.
