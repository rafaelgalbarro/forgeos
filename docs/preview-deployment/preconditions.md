# Preconditions

Deploy is **blocked** when any blocking precondition fails:

| ID | Label | Blocking |
|----|-------|----------|
| `sandbox_build` | Sandbox build passed (5370) | Yes |
| `critical_errors` | No critical errors | Yes |
| `qa_gate` | QA gates from sandbox | Yes |
| `security_scan` | Security scan not blocked | Yes |
| `approval` | Founder approval | Yes (when required) |
| `rollback_plan` | Rollback documented | Yes |
| `provider_health` | Provider health | No |
| `feature_flag` | Preview deployment flag | No (dry-run allowed) |
| `no_secrets` | No secrets in project files | Yes |
| `environment_preview` | Preview environment only | Yes |

The **Publicar Preview** button stays disabled until all blocking gates pass and approval is granted.
