# Skill Telemetry

Recorded per execution:

- Provider, model/skill, latency, cost
- Success, fallback, rate limit hits
- Audit log ID, memory record ID
- Runtime session ID

```ts
import { getSkillTelemetry, getSkillAuditLogs } from "@/lib/skills";
```

Storage: `STORAGE_KEYS.skillTelemetry`, `skillAuditLogs`, `skillMemory`
