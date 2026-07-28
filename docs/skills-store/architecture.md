# Skill Store Architecture (RC4.8)

## Module Flow

```
lib/skills/* registries
        ↓
lib/skills-store/registry.ts  →  buildStoreCatalog()
        ↓
├── catalog.ts      (browse/search/filter)
├── versions.ts     (semver + changelog)
├── dependencies.ts (resolution graphs)
├── marketplace.ts  (featured + mock ratings)
├── install.ts      (mock install/uninstall)
└── store.ts        (localStorage persistence)
        ↓
Pages: /marketplace, /store, /lab/skill-store
```

## Dependency Rule

- `lib/skills-store` imports `lib/skills` and `lib/skills-governance`
- `lib/skills` does **not** import `lib/skills-store`
- Optional adapter at `lib/skills/adapters/store-adapter.ts` not required for RC4.8

## Storage Keys

| Key | Content |
|-----|---------|
| `skillStoreCatalog` | Cached catalog snapshot |
| `skillStoreInstalled` | Per-venture installed items |
| `skillStoreMarketplace` | Marketplace listing cache |

## Categories

Skills, Departments, Workers, Templates, Knowledge Packs, Build Packs, Prompt Packs, Providers, Versions, Dependencies.
