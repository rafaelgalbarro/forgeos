# Universal Skill Store (RC4.8)

ForgeOS official marketplace for installable Skills, Departments, Workers, Templates, Knowledge Packs, Build Packs, Prompt Packs, Providers, Versions, and Dependencies.

## Routes

| Route | Purpose |
|-------|---------|
| `/marketplace` | Public browse — featured, categories, search |
| `/store` | Official store — install/uninstall to venture workspace |
| `/lab/skill-store` | Engineering lab — catalog stats, dependency graphs |

## Architecture

- **lib/skills-store/** — core store modules (no circular imports with lib/skills)
- Aggregates from: `lib/skills/registry`, domain registries (developer, cloud, productivity, business, marketing, analytics, ai)
- Governance: risk levels via `lib/skills-governance/risk-engine`
- Persistence: localStorage via `STORAGE_KEYS.skillStore*`

All mock/local — no external marketplace APIs.

See [architecture.md](./architecture.md) for module diagram.
