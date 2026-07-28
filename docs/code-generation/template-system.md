# Template System

Templates live in `lib/code-generation/templates/<template-id>/manifest.json`.

Each manifest defines:
- Stack (framework, language, database, auth)
- File structure conventions
- Dependencies and scripts
- Environment variables
- Generator reference

Generators customize templates via Build Context artifacts and Build DNA — logic stays in generators, not duplicated in manifests.

## Available templates

| ID | Stack |
|----|-------|
| `website-nextjs` | Next.js + TypeScript + Tailwind |
| `webapp-nextjs-supabase` | Next.js + Supabase |
| `mobile-expo` | Expo Router + React Native |
| `backend-node-api` | Express + TypeScript |
| `fullstack-nextjs-supabase` | Next.js fullstack |
