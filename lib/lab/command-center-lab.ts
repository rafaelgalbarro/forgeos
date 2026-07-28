/** Program 4500 — Command Center lab harness. */

import { runCommandCenterLab } from "@/lib/command-center";
import type { CommandCenterSnapshot } from "@/lib/command-center";

export type CommandCenterLabSnapshot = CommandCenterSnapshot;

export async function runCommandCenterLabHarness(): Promise<CommandCenterLabSnapshot> {
  return runCommandCenterLab();
}
