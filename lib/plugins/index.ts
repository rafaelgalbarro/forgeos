/** RC9 — Plugins thin wrapper. */

export {
  listPlugins,
  getPluginById,
  getPluginsForPack,
  simulatePluginLoad,
} from "@/lib/ecosystem/plugin-engine";

export type { PluginManifest } from "@/lib/ecosystem/types";
export type { PluginLoadResult } from "@/lib/ecosystem/plugin-engine";
