# Executive Protocol — RC4

```
Founder
  ↓
CEO
  ↓
Executive Mesh
  ↓
Departments
  ↓
Consensus
  ↓
Skill Request
  ↓
Skill Router
  ↓
Skill (sandbox)
  ↓
Result → Runtime → Memory → Decision Graph
  ↓
Founder Response
```

```ts
import { runExecutiveProtocol } from "@/lib/executive-mesh";

const result = await runExecutiveProtocol({
  ventureId: "demo-venture-vandl",
  ventureName: "VANDL",
  topic: "Deploy preview",
  urgency: "medium",
});
```
