# Plugin Sandbox (RC9)

Plugins never execute in the real ForgeOS runtime.

## Sandbox Rules

1. `simulatePluginLoad()` registers hooks in memory only
2. No filesystem access
3. No network calls
4. No runtime hook invocation

## Load Flow

```
select plugin → simulatePluginLoad() → hooksRegistered[] → UI feedback
```

## CRM Sync Plugin Demo

Part of CRM Pack dependencies:

- `eco-plugin-crm-sync`
- Hooks: onContactCreate, onDealUpdate, onPipelineChange
- Permissions: crm.read, crm.write, webhook.emit

Status: `sandbox`
