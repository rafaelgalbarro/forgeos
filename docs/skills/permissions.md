# Skill Permissions

Department-based access via `policies.ts`:

- CEO can approve any skill
- Finance/CFO for payments
- CTO/Infrastructure for cloud
- Legal for legal skills
- CMO/Growth for marketing

```ts
import { checkSkillPermission } from "@/lib/skills/permissions";
```
