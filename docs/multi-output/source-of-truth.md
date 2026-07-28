# Shared Source of Truth

All outputs consume entities from `lib/multi-output/shared-context.ts`.

## Entities

| Entity | Consumed By |
|--------|------------|
| companyIdentity | Venture, Website, GTM, Investor |
| brand + designTokens | Website, App, Mobile, Investor, GTM |
| pricing | Website, App, Investor, GTM |
| users/roles | Backend, API, App |
| entities | Backend, Database, API |
| apiContract | Backend, API, Web App, Mobile |
| businessRules | Backend, App |
| analyticsEvents | App, Mobile, GTM |
| legal | Website, App |
| environment | Deployment |

## Exports

- **Design Token Package** — `exportDesignTokenPackage()` — NO ForgeOS FHIS imports
- **API Contracts** — `exportApiContracts()` → `packages/contracts/`

## Update Flow

Decision change → update shared context field → sync only affected outputs
