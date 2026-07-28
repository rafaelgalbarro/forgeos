# Command Allowlist

Allowed commands via `lib/preview-runtime/security/command-allowlist.ts`:

| Command | Phase | Notes |
|---------|-------|-------|
| `npm ci` | install | Preferred |
| `npm install` | install | `--no-audit --no-fund` |
| `npm run build` | build | Real build |
| `npm run dev` | dev | `-p <port> -H 127.0.0.1` |
| `npm run start` | start | Production start |
| `npx expo start` | dev | `--localhost` only |
| `npx tsx src/server.ts` | dev | Backend express |
| `npm run test` | test | Declared tests only |

## Blocked Patterns

- Shell chaining: `&&`, `|`, `;`
- Redirection: `>`, `<`
- Subshells: `` ` ``, `$(`
- `sudo`, `rm -rf`, `git clone`, `npm publish`, `deploy`
- `curl|sh`, `wget`

## Windows

Uses `npm.cmd` / `npx.cmd` with `shell: false` for safe spawning.
