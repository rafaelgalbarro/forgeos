# SDK API Reference (RC9)

## MarketplaceClient (mock)

```typescript
const client = new MarketplaceClient({ mode: 'sandbox' });
await client.search('CRM');
await client.getDependencies('eco-pack-crm');
await client.simulateInstall('eco-pack-crm', { ventureId });
```

## PluginBuilder (mock)

```typescript
const plugin = new PluginBuilder('my-plugin')
  .hook('onContactCreate', handler)
  .sandbox();
```

## Exports by Module

| Module | Exports |
|--------|---------|
| sdk-core | VentureClient, WorkspaceClient, MeshClient |
| sdk-marketplace | MarketplaceClient, PackInstaller, DependencyResolver |
| sdk-plugins | PluginBuilder, HookRegistry, SandboxRunner |
| sdk-ventures | VentureFactory, IntelligenceClient, FinancialMetrics |
| sdk-ai | AiRuntime, PromptCompiler, ModelRouter |

Implementation: `lib/ecosystem/sdk-engine.ts`
