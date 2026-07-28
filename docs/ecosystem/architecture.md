# Ecosystem Architecture (RC9)

## Module Flow

```
lib/skills-store/* (RC4.8)
        ↓ adapter
lib/ecosystem/
├── marketplace-engine.ts  → search + featured + CRM demo
├── store-engine.ts        → compose skill-store + ecosystem packs
├── plugin-engine.ts       → plugin manifests (sandbox)
├── extension-loader.ts    → load extensions (dry-run)
├── package-manager.ts     → resolve + simulate install
├── sdk-engine.ts          → SDK modules surface
├── creator-economy.ts     → creator catalog mock
├── quality-score.ts       → heuristic scores
├── review-engine.ts       → mock reviews
├── versioning-engine.ts   → semver + changelog
├── dependency-resolver.ts → compose skills-store deps
└── installation-engine.ts → simulate only (NO real install)
        ↓
lib/marketplace/ | lib/sdk/ | lib/plugins/  (thin wrappers)
        ↓
Pages: /marketplace, /store, /plugins, /sdk, /lab/ecosystem
```

## Adapter Rule

- `lib/ecosystem` imports `lib/skills-store` — never the reverse
- RC4.8 Skill Store functionality preserved via composition
- Ecosystem packs extend catalog without replacing skill-store items

## Pack Types

Skills, Capabilities, Departments, Workers, Templates, Knowledge Packs, Prompt Packs, AI Packs, Business Packs, Build Packs, Plugins.

## Sandbox Guarantee

`installation-engine.ts` and `package-manager.ts` only simulate. No filesystem writes, no runtime hooks, no provider calls.
