# Build Policy — Program 4290

Who may run build commands and when.

## Authority

| Role | May run |
|------|---------|
| **Architecture Owner** | `npm run build`, `npm run check`, `npm run reset:dev`, `npm run dev:clean`, `npm install` |
| **Domain agents** | `npm run lint` (scoped), `npm run dev:fast` (local smoke only) |
| **All others** | Read-only — no install, no clean, no build |

## Command rules

| Command | Rule |
|---------|------|
| `npm run build` | **Once per merge wave** — after all PRs integrated |
| `npm run reset:dev` | **Never parallel** — kills ports, clears `.next` |
| `npm run dev:clean` | Same as `reset:dev` — Architecture Owner only |
| `npm install` | Single editor — lockfile changes serialize |
| `npm run dev:fast` | Local verification only; not a CI substitute |
| `npm run check` | `doctor` + build — pre-release only |

## Wave build sequence

```
Merge PR 1 → (no build)
Merge PR 2 → (no build)
...
Merge PR N → Architecture Owner: npm run build
           → verify / and /command-center
           → tag RC if green
```

## Parallel agent prohibition

- Agents **must not** each run `npm run build` on separate branches simultaneously on shared CI
- Agents **must not** run `reset:dev` while another agent's dev server is the verification target
- Only **one** `package.json` change per wave

## Docs-only exception

Programs like **4290** (docs-only):

- Build optional during development
- **Required** once before wave close — exit code 0
- No `reset:dev` unless build cache corrupted

## Failure protocol

1. Capture build log
2. Identify owning zone from error path
3. Assign fix to zone owner — not parallel drive-by fixes
4. Re-run **single** build after fix merge

## Scripts reference

From `package.json`:

- `dev` — `node scripts/dev.js`
- `dev:fast` — `node scripts/dev-fast.js`
- `reset:dev` / `dev:clean` — `node scripts/dev-reset.js`
- `build` — `next build`
- `doctor` — environment diagnostics

PATH note: prepend `C:\Users\RafaelGalbarroBarba\AppData\Local\forgeos-node` for ForgeOS Node toolchain when using project scripts.
