# Epic 6.7 — Infrastructure Factory

## Goal

Infrastructure Factory consumes Build Context, Build DNA, and Build Registry to generate **planning artifacts** for deployment and cloud infrastructure.  
It does **not** deploy resources or store real credentials.

## Module

`lib/build-platform/infrastructure-factory/`

Main responsibilities:

- Build unified infrastructure blueprint metadata
- Generate Docker compose/service specs
- Plan GitHub Actions CI/CD workflows
- Define Vercel, Cloudflare, Supabase, and Railway adapter configs
- Prepare AWS, Azure, and GCP resource blueprints
- Validate blueprint completeness

## Inputs

- `build-context` via direct import from `lib/build-platform/build-context`
- `build-dna` via direct import from `lib/build-platform/build-dna`
- `build-registry` via direct import from `lib/build-platform/build-registry`

When upstream APIs are partial, lab harness normalizes data through adapters.

## Outputs

`InfraBlueprint` includes:

- `docker`
- `cicd` (GitHub Actions)
- `vercel`
- `cloudflare`
- `supabase` (config spec only, no connection)
- `railway`
- `aws`
- `azure`
- `gcp`
- `validation`

## Constraints

- Adapter configs only — no real API keys or credentials
- No deployment execution
- Does not modify Runtime, Dashboard, Mission Control, AI Gateway, or AI Orchestration
- Compatible with Epic 6.0–6.6

## Lab

Route: `/lab/infrastructure-factory`

Files:

- `app/lab/infrastructure-factory/page.tsx`
- `components/lab/InfrastructureFactoryLab.tsx`
- `lib/lab/infrastructure-factory-lab.ts`

Action button: **Generar Infrastructure Blueprint**

The lab renders all infrastructure target sections for review using FHIS components.
