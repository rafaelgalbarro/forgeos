/** RC9 — SDK engine (ForgeOS developer surface). */

import type { SdkModule } from "./types";

const SDK_MODULES: SdkModule[] = [
  {
    id: "sdk-core",
    name: "@forgeos/sdk-core",
    description: "API core: ventures, workspace, mesh ejecutivo.",
    category: "core",
    exports: ["VentureClient", "WorkspaceClient", "MeshClient"],
    version: "1.0.0",
  },
  {
    id: "sdk-marketplace",
    name: "@forgeos/sdk-marketplace",
    description: "Browse, search e instalar packs (sandbox).",
    category: "marketplace",
    exports: ["MarketplaceClient", "PackInstaller", "DependencyResolver"],
    version: "1.0.0",
  },
  {
    id: "sdk-plugins",
    name: "@forgeos/sdk-plugins",
    description: "Registrar plugins y hooks en modo sandbox.",
    category: "plugins",
    exports: ["PluginBuilder", "HookRegistry", "SandboxRunner"],
    version: "0.9.0",
  },
  {
    id: "sdk-ventures",
    name: "@forgeos/sdk-ventures",
    description: "Venture Factory e Intelligence APIs.",
    category: "ventures",
    exports: ["VentureFactory", "IntelligenceClient", "FinancialMetrics"],
    version: "1.0.0",
  },
  {
    id: "sdk-ai",
    name: "@forgeos/sdk-ai",
    description: "AI Runtime: prompts, model routing, streaming.",
    category: "ai",
    exports: ["AiRuntime", "PromptCompiler", "ModelRouter"],
    version: "2.0.0",
  },
];

export function listSdkModules(category?: SdkModule["category"]): SdkModule[] {
  if (!category) return [...SDK_MODULES];
  return SDK_MODULES.filter((m) => m.category === category);
}

export function getSdkModule(id: string): SdkModule | undefined {
  return SDK_MODULES.find((m) => m.id === id);
}

export interface SdkQuickStart {
  install: string;
  import: string;
  example: string;
}

export function getSdkQuickStart(moduleId = "sdk-marketplace"): SdkQuickStart {
  const mod = getSdkModule(moduleId) ?? SDK_MODULES[1];
  return {
    install: `npm install ${mod.name}`,
    import: `import { MarketplaceClient } from '${mod.name}';`,
    example: `const client = new MarketplaceClient({ mode: 'sandbox' });
const packs = await client.search('CRM');`,
  };
}

export function getSdkApiSurface(): { module: string; exports: string[] }[] {
  return SDK_MODULES.map((m) => ({ module: m.name, exports: m.exports }));
}
