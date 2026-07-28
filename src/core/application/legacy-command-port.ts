/**
 * Legacy flat application command bus port (pre-CQ ApplicationPorts).
 * Renamed from ports.ts so ./ports resolves to the CQ ports folder.
 */

import type { ApplicationCommand, CommandResult } from "./commands";

export interface ApplicationCommandBus {
  dispatch(command: ApplicationCommand): Promise<CommandResult>;
}
