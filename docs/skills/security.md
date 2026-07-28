# Skill Security

Every skill has:

- **Scopes** — permission strings per skill
- **Sandbox** — no real external calls in RC4
- **Rate limits** — 30 calls/minute window
- **Timeout** — category-specific (15-60s)
- **Audit** — full audit log per execution
- **Rollback** — recovery plan for high-risk skills (payments, cloud)

```ts
import { runSkillSecurityCheck } from "@/lib/skills/security";
```
