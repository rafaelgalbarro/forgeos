# Forge Capability Layer (RC4.9)

Departments and workers request **capabilities**, never skills directly. The Capability Layer auto-resolves skill, provider, policy, approval, fallback, and sandbox mode.

## Flow

```
Founder → CEO → Executive Mesh → Capability Layer → Resolver → Skill Router → Skill → Provider → Execution
```

## Entry point

```ts
import { runCapabilityRequest } from "@/lib/capabilities";

const result = await runCapabilityRequest({
  capabilityId: "deploy_software",
  context: {
    ventureId: "demo-venture",
    requestedBy: "deployment",
    approvedBy: "ceo",
    action: "deploy_preview",
  },
});
```

## Modules

| Module | Role |
|--------|------|
| `capability-registry.ts` | 36 capability definitions |
| `capability-resolver.ts` | Auto-resolve skill, provider, policy |
| `capability-planner.ts` | Multi-step execution plans |
| `pipeline.ts` | `runCapabilityRequest()` orchestrator |
| `adapters/skills-adapter.ts` | Delegates to Skills Framework |

See `docs/capabilities/` for full documentation.
