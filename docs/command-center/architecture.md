# Command Center — Architecture

```
CommandCenterDashboard
       ↓
runCommandCenterEngine()
       ├── buildCeoPanel()          → CEO + Founder Dashboard + Organization
       ├── buildVenturePanel()      → Health + Portfolio
       ├── buildAiPanel()           → AI Control Center
       ├── buildSelfEvolutionPanel()→ Self Evolution Engine
       ├── buildBuildPanelAsync()   → Build Pipeline
       ├── buildTimelinePanel()     → Founder Activity
       ├── buildNotificationsPanel()→ Organization notifications
       └── getCombinedMarketplaceStats() → Marketplace
```

Sin motores nuevos. Solo orquestación en `lib/command-center/`.
