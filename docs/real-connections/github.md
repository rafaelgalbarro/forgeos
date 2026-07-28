# GitHub Connection

**Env:** `GITHUB_TOKEN`

## Capabilities

- `create_repository`
- `create_branch`
- `open_pull_request`
- `prepare_release`

## Operations

| Operation | Mode | Description |
|-----------|------|-------------|
| validate | read-only | Check token via `/user` |
| list_repos | read-only | List accessible repos |
| create_repository | dry-run | Plan repo + branch protection |
| create_branch | dry-run | Plan branch creation |
| open_pull_request | dry-run | Plan PR |
| prepare_release | dry-run | Plan tag + changelog |

## Rollback

Repo creation → delete repo. Branch → delete branch. PR → close PR.
