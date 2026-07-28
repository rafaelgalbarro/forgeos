# Universal Skill Store (RC4.8)

Official ForgeOS marketplace for Skills, Departments, Workers, Templates, Knowledge Packs, Build Packs, Prompt Packs, Providers, Versions, and Dependencies.

## Modules

| Module | Purpose |
|--------|---------|
| `types.ts` | Store item types and contracts |
| `registry.ts` | Aggregates installable items from all skill domain registries |
| `catalog.ts` | Browse, search, filter, categorize |
| `versions.ts` | Semver comparison and changelog |
| `dependencies.ts` | Dependency resolution graphs |
| `marketplace.ts` | Featured listings and mock ratings |
| `install.ts` | Mock install/uninstall to venture workspace |
| `store.ts` | localStorage persistence |

## Routes

- `/marketplace` — public browse
- `/store` — official install/manage
- `/lab/skill-store` — engineering visualization

## Storage Keys

- `skillStoreCatalog`
- `skillStoreInstalled`
- `skillStoreMarketplace`

All mock/local — no external marketplace APIs.
