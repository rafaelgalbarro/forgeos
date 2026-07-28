# Versioning Policy

PROGRAM 4700 uses semver per agent via `lib/agents-marketplace/agent-version.ts`.

## AgentVersion Shape

```typescript
interface AgentVersion {
  version: string;       // e.g. "1.0.0"
  releasedAt: string;    // ISO date
  changelog: string;   // Spanish release notes
  semver: { major, minor, patch };
  status: "stable" | "beta" | "deprecated";
}
```

## Policy

| Status | Meaning |
|--------|---------|
| `stable` | Production-ready catalog entry |
| `beta` | Preview — may change without major bump |
| `deprecated` | Superseded; install still allowed but not recommended |

## Version History

Each agent slug has a `VERSION_HISTORY` map. Agents without explicit history fall back to their registry `version` field.

## Install Version Pinning

When a user installs an agent, `InstallRecord.version` captures the version at install time.
Upgrades are a future feature; current scope records the version snapshot only.

## API

```typescript
import { getVersionHistory, getLatestVersion, compareVersions } from "@/lib/agents-marketplace";

const history = getVersionHistory("ceo");
const latest = getLatestVersion("research");
```
