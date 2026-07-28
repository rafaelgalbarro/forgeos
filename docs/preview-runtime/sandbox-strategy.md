# Sandbox Strategy

## Detection

On startup, `docker --version` is executed via `child_process.spawn`.

| Result | Strategy | Isolation claim |
|--------|----------|-----------------|
| Docker available | `docker` | Container isolation (future: full Docker run) |
| Docker missing/failed | `child-process` | Restricted child process in temp dir |

**We do NOT claim Docker isolation if Docker is not installed.**

## Child Process Fallback (Windows)

When Docker is unavailable:

1. Create temp dir: `os.tmpdir()/forgeos-sandbox-{id}`
2. Copy CodeProject files (path guard enforced)
3. Run allowed commands with `spawn(program, args, { cwd: sandboxDir, shell: false })`
4. Assign port 3100+ (localhost bind only)
5. Monitor logs, health, resource limits
6. Kill switch via `taskkill` (Windows) or `SIGTERM`

## Per-Sandbox Isolation

Each sandbox gets:

- Own directory (no ForgeOS `node_modules`)
- Own port
- Own env (`NODE_ENV=development`, `PREVIEW_MODE=true`, etc.)
- Own process tree
- Timeout + resource limits
- Log buffer (server-side)

## ForgeOS Separation

**Sequential workflow:**

1. ForgeOS: `kill:ports` → `clean` → `build` → `reset:dev`
2. Sandboxes: started separately via API (never mixed with ForgeOS `.next`)

## Cleanup

- Stop processes
- Free ports
- Delete `node_modules` + `.next` in sandbox dir
- Keep logs/manifest in store
- "Limpiar sandbox" action for full cleanup

## Docker Roadmap

Current implementation detects Docker and documents strategy. Full `docker run` container execution is the preferred path when Docker is available; child-process fallback is the active implementation on Windows without Docker.
