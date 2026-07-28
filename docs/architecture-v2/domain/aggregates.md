# Aggregates — PROGRAM 6010

| Aggregate | Isolation / role | Must not contain |
|-----------|------------------|------------------|
| **Workspace** | Org isolation root | Product UI state |
| **Founder** | Ownership / profile VO | Auth provider secrets |
| **Venture** | Strategic venture | Code files, build logs |
| **Mission** | Lifecycle coordinator | Factory execution |
| **Decision** | Decision states + options | Chain-of-thought / reasoning blobs |
| **Artifact** | Knowledge artifacts | Executable code payloads |
| **Product** | Product identity under venture | Runtime logs |
| **Output** | Creation output product surface | Full file trees (refs only via metadata) |
| **Codebase** | Source inventory | Execution logs |
| **Build** | Compile/package job | Preview URLs / release marketing |
| **Preview** | Ephemeral preview of a build | Production deployment state |
| **Release** | Versioned shippable unit | Live infra handles |
| **Deployment** | Release → environment | Build compilation details |
| **Operation** | Operating activity record | Auto-execution |
| **EvolutionProposal** | Proposed change | Auto-applied patches |

## Official pipeline separation

```
Codebase → Build → Preview
                 ↘ Release → Deployment
```

Preview, Release, and Deployment are distinct aggregates with explicit foreign keys (`buildId`, `releaseId`).
