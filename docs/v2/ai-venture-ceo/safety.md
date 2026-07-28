Safety policy engine:

- `ADVISORY`: never executes actions.
- `SUPERVISED`: only reversible non-gated actions.
- `AUTONOMOUS_SAFE`: explicit low-risk allowlist only.

Always approval-gated:

- CLOSE, PIVOT, MERGE, LAUNCH
- major resource allocation/release
- critical human-review escalations

All blocked attempts are audited.
