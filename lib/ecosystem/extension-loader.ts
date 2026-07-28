/** RC9 — Extension loader (sandbox / dry-run). */

import { simulatePluginLoad } from "./plugin-engine";
import type { SandboxMode } from "./types";

export interface ExtensionLoadRequest {
  packId: string;
  extensions: string[];
  mode: SandboxMode;
}

export interface ExtensionLoadResult {
  packId: string;
  mode: SandboxMode;
  loaded: string[];
  failed: string[];
  messages: string[];
}

export function loadExtensions(request: ExtensionLoadRequest): ExtensionLoadResult {
  const loaded: string[] = [];
  const failed: string[] = [];
  const messages: string[] = [];

  for (const ext of request.extensions) {
    if (ext.startsWith("eco-plugin-") || ext.startsWith("@forgeos/")) {
      const pluginId = ext.startsWith("@forgeos/")
        ? ext.replace("@forgeos/", "eco-plugin-").replace("plugin-", "plugin-")
        : ext;
      const result = simulatePluginLoad(pluginId);
      if (result.loaded) {
        loaded.push(ext);
        messages.push(result.message);
      } else {
        failed.push(ext);
        messages.push(result.message);
      }
    } else {
      loaded.push(ext);
      messages.push(`[${request.mode}] Extensión ${ext} registrada (sandbox)`);
    }
  }

  return { packId: request.packId, mode: request.mode, loaded, failed, messages };
}

export function unloadExtensions(packId: string): { success: boolean; message: string } {
  return {
    success: true,
    message: `[Sandbox] Extensiones de ${packId} descargadas — sin efecto en runtime real`,
  };
}
