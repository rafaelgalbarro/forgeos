/** RC9 — Plugin engine (sandbox only). */

import { ECOSYSTEM_PACK_CATALOG } from "./catalog";
import type { PluginManifest, PackStatus } from "./types";

const PLUGIN_MANIFESTS: PluginManifest[] = [
  {
    id: "eco-plugin-crm-sync",
    name: "CRM Sync Plugin",
    version: "0.9.2",
    description: "Sincronización bidireccional de contactos y deals (sandbox).",
    entryPoint: "@forgeos/plugin-crm-sync",
    permissions: ["crm.read", "crm.write", "webhook.emit"],
    hooks: ["onContactCreate", "onDealUpdate", "onPipelineChange"],
    status: "sandbox",
    publisher: "Integrations Co",
  },
  {
    id: "eco-plugin-analytics",
    name: "Analytics Bridge Plugin",
    version: "1.0.0",
    description: "Ingesta de eventos analytics al venture workspace.",
    entryPoint: "@forgeos/plugin-analytics",
    permissions: ["analytics.read", "events.ingest"],
    hooks: ["onPageView", "onConversion"],
    status: "active",
    publisher: "DataForge",
  },
  {
    id: "eco-plugin-slack",
    name: "Slack Notifications Plugin",
    version: "1.1.0",
    description: "Notificaciones ejecutivas a Slack (dry-run).",
    entryPoint: "@forgeos/plugin-slack",
    permissions: ["notifications.send", "channels.read"],
    hooks: ["onCeoBrief", "onDecisionRequired"],
    status: "beta",
    publisher: "ForgeOS Official",
  },
  {
    id: "eco-plugin-stripe",
    name: "Stripe Revenue Plugin",
    version: "2.0.0",
    description: "Métricas de revenue desde Stripe (simulado).",
    entryPoint: "@forgeos/plugin-stripe",
    permissions: ["payments.read", "subscriptions.read"],
    hooks: ["onPayment", "onSubscriptionChange"],
    status: "active",
    publisher: "ForgeOS Official",
  },
];

export function listPlugins(status?: PackStatus): PluginManifest[] {
  if (!status) return [...PLUGIN_MANIFESTS];
  return PLUGIN_MANIFESTS.filter((p) => p.status === status);
}

export function getPluginById(id: string): PluginManifest | undefined {
  return PLUGIN_MANIFESTS.find((p) => p.id === id);
}

export function getPluginsForPack(packId: string): PluginManifest[] {
  const pack = ECOSYSTEM_PACK_CATALOG.find((p) => p.id === packId);
  if (!pack) return [];
  return pack.dependencies
    .map((dep) => getPluginById(dep))
    .filter((p): p is PluginManifest => p !== undefined);
}

export interface PluginLoadResult {
  pluginId: string;
  loaded: boolean;
  mode: "sandbox";
  hooksRegistered: string[];
  message: string;
}

export function simulatePluginLoad(pluginId: string): PluginLoadResult {
  const plugin = getPluginById(pluginId);
  if (!plugin) {
    return {
      pluginId,
      loaded: false,
      mode: "sandbox",
      hooksRegistered: [],
      message: `Plugin no encontrado: ${pluginId}`,
    };
  }
  return {
    pluginId,
    loaded: true,
    mode: "sandbox",
    hooksRegistered: plugin.hooks,
    message: `[Sandbox] Plugin ${plugin.name} cargado — sin ejecución real`,
  };
}
