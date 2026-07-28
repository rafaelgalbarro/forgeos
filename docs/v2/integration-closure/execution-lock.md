# Execution Lock

**Module:** `scripts/lib/exclusive-execution-lock.js`  
**Lock dir:** `.forgeos/locks/`

## Behavior

- Atomic acquire via `openSync(..., "wx")`
- Records owner, command, pid, timestamp, heartbeatAt, hostname
- Stale detection when owner PID is dead
- **Does not** auto-delete lock if owner PID is still alive
- Explicit block message includes lock path, process, command, age, safe action

## Usage

Acquired by `scripts/run-sequential-v2-validation.js` (`npm run validate:v2-integration`).
