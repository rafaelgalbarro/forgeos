# GitHub Repository Creation

When `ENABLE_PREVIEW_GITHUB_PUSH=true` and `GITHUB_TOKEN` configured:

- Private repository plan/create
- Safe slugified name
- Initial branch `preview/studio`
- Commit with README, `.env.example`, manifest, release notes

**Never uploaded:** `.env.local`, `credentials.json`, `*.pem`, secret values.

When disabled: **Repository Plan only** with DRY RUN banner.

No force push. No destructive overwrite.
