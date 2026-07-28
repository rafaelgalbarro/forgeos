# Mission Control Architecture

## Layer diagram

```mermaid
flowchart TB
  subgraph UI["components/mission-control/"]
    Shell[MissionControlShell]
    Conv[MissionConversation]
    Status[MissionStatusPanel]
    Progress[MissionProgressPanel]
  end

  subgraph Coordinator["lib/mission-control/"]
    CE[conversation-engine]
    IE[intention-engine]
    MF[mission-flow]
    SR[smart-routing]
    MS[mission-snapshots]
  end

  subgraph Adapters["lib/mission-control/adapters/"]
    FA[founder-adapter]
    WA[website-factory-adapter]
    AA[application-factory-adapter]
    MA[mobile-factory-adapter]
    EM[executive-mesh-adapter]
    AI[ai-runtime-adapter]
    CF[cloud-foundation-adapter]
    PR[production-adapter]
  end

  subgraph Existing["Existing ForgeOS (public APIs only)"]
    FZ[lib/founder-zero]
    WF[lib/website-factory]
    AF[lib/application-factory]
    MF2[lib/mobile-factory]
    Mesh[lib/executive-mesh]
    AIR[lib/ai-runtime]
  end

  Shell --> CE
  CE --> IE
  CE --> MF
  CE --> SR
  SR --> Adapters
  Adapters --> Existing
  MS --> Shell
```

## SSR snapshot strategy

| Layer | Load time | Imports |
|-------|-----------|---------|
| `app/mission-control/page.tsx` | SSR | `buildMissionControlSnapshot()` only |
| `MissionControlShell` | Client dynamic | conversation-engine, persistence |
| Factory adapters | On demand | `import()` when user starts BUILD phase |
| Executive mesh | On important decision | summary adapter, no chain-of-thought |

## What Mission Control does NOT do

- Does not modify `lib/runtime/`, `lib/executive-mesh/`, `lib/ai-runtime/`, or `lib/skills/` internals
- Does not duplicate factory pipeline logic
- Does not expose executive reasoning chains
