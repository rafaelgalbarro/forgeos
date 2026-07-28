# Capability Execution

## Pipeline stages

`runCapabilityRequest()` runs:

1. request → validate → route → resolve → plan → approve → execute → runtime → memory → telemetry → metrics → complete

## Sandbox

All execution is mock/sandbox. No real API connections. Skills adapter calls `runSkillRequest` which flows through Skills Governance.

## Blocked requests

Validation or permission failures return a blocked `CapabilityResult` with `success: false` and audit entry `outcome: "blocked"`.

## Runtime dispatch

`dispatchCapabilityToRuntime` emits `CAPABILITY_EXECUTION_PLANNED` with skill IDs and sandbox mode.
