# Preview Security

PROGRAM 5350 enforces preview safety across all outputs.

## Prohibited

- Real Skills execution
- Real payments
- Real emails
- Production data
- Real tokens
- Production deploy
- Fake real URLs

## Allowed Modes

| Mode | Use |
|------|-----|
| `mock` | Static demo data |
| `sandbox` | Isolated preview (iframe srcDoc) |
| `dry-run` | Plan documented, no execution |
| `preview-plan` | Expo/Vercel plan stubs |

## Deployment Output

Always shows `DRY RUN / PREVIEW PLAN / NOT DEPLOYED` when `dryRun: true`.

## Validation Check

`output-validator.ts` includes `preview-safety` and `no-prod-deploy` checks.

## Mobile

No real APK. Expo Preview Plan only.

## Website / App

Functional demos with demo data — not wireframes, but no real backend.
