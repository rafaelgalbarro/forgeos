# Release Governance — Program 4290

Promotion path from development to production. **Release Owner** promotes; agents do not self-deploy.

## Environments

| Stage | Purpose | Gate |
|-------|---------|------|
| **Dev** | Local `dev:fast` / agent work | Zone + program charter |
| **Preview** | PR preview / branch deploy | Lint + optional smoke |
| **Staging** | RC validation | `npm run build` exit 0 |
| **Production** | Live ForgeOS | Release Owner sign-off |

## Promotion flow

```
Dev (agent zones)
    ↓ merge queue complete
Preview (PR)
    ↓ single build green
Staging (RC tag)
    ↓ route verify + program checklist
Production (Release Owner)
```

## Release Owner responsibilities

1. Confirm merge wave followed [merge-policy.md](./merge-policy.md)
2. Run `npm run build` — sole authority per [build-policy.md](./build-policy.md)
3. Verify routes: `/`, `/command-center`, critical program paths
4. Confirm no unauthorized protected-core changes
5. Promote RC → Production with changelog entry

## Quality gates (per program)

| Program | Staging gate |
|---------|--------------|
| 4000 Founder Zero | Lab harness `/lab/founder-zero` loads |
| 4100 Cleanup | Nav registry consistent with `sidebar-items.ts` |
| 4200 Stabilization | Route matrix docs current |
| 4250 Performance | No full engine import on `/` first paint |
| 4255 First Experience | Creation cards + CC CTA render |
| 4290 Governance | `docs/engineering/` complete |
| 4500 Command Center | `/command-center` HTTP 200 |
| 6000 Commercial | `/billing` dry-run mode |
| 6500 Production | `/production` health center |
| 8000 Customer Success | `/customer-success` shell |
| 9000 Network | `/network` dashboard |
| 10000 Venture E2E | `/ventures/[slug]` fixture loads |

## Versioning

- Master Program version: `lib/programs/constants.ts` → `PROGRAM_VERSION`
- Per-domain: e.g. `COMMAND_CENTER_VERSION`, `PRODUCTION_READINESS_VERSION`
- RC tags: align with lab pages (`/lab/rc1`, `/lab/os-rc2`)

## Rollback policy

- Production rollback via revert commit — no force-push main
- Staging may fast-forward after fix
- Incident path: `app/incidents/` (Program 6500 stub)

## Related docs

- [../delivery/02_release_process.md](../delivery/02_release_process.md)
- [../delivery/03_quality_gates.md](../delivery/03_quality_gates.md)
- [../build-platform/09_release_manager.md](../build-platform/09_release_manager.md)

## Documentation releases

Docs-only programs (4290) ship with code waves but **do not** require feature flags. Update [README.md](./README.md) status when complete.
