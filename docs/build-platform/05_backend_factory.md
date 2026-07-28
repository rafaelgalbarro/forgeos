# Epic 6.4 — Backend Factory

## Goal

Backend Factory consumes Build Context, Build DNA, and Build Registry to generate **planning artifacts** for backend implementation.  
It does **not** generate final runtime code or deployment configs.

## Module

`lib/build-platform/backend-factory/`

Main responsibilities:

- Build unified backend blueprint metadata
- Plan API routes and endpoint contracts
- Define service layer responsibilities
- Specify repository/data access operations
- Map domain events and consumers
- Plan background workers (registry-linked + domain workers)
- Derive security rules from DNA and context
- Define RBAC permission matrix
- Plan background jobs and queue schedules
- Validate blueprint completeness

## Inputs

- `build-context` via direct import from `lib/build-platform/build-context`
- `build-dna` via direct import from `lib/build-platform/build-dna`
- `build-registry` via direct import from `lib/build-platform/build-registry`

When upstream APIs are partial, lab harness normalizes data through adapters.

## Outputs

`BackendBlueprint` includes:

- `api` — REST or tRPC endpoint plan
- `services` — domain service specs
- `repositories` — data access layer specs
- `events` — domain event topics and consumers
- `workers` — background worker specs
- `security` — rules, middleware, encryption flags
- `permissions` — RBAC role/resource matrix
- `jobs` — queue jobs and schedules
- `validation`

## Lab

Route: `/lab/backend-factory`

Files:

- `app/lab/backend-factory/page.tsx`
- `components/lab/BackendFactoryLab.tsx`
- `lib/lab/backend-factory-lab.ts`

Action button: **Generar Backend Blueprint**

The lab renders all blueprint sections for review using FHIS components (Panel, Badge, Status, Cards, Tables, KpiBlock).

## Dependencies

| Epic | Module | Usage |
|------|--------|-------|
| 6.0 | build-context | Venture metadata, security section, completeness |
| 6.1 | build-dna | Stack (backend, database, auth), architecture, security rules |
| 6.2 | build-registry | Backend generators, build workers, capabilities |
