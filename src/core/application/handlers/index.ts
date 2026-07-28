/** Composition root — wires buses + handlers without coupling to providers. */

import { createCommandBus } from "../commands/bus";
import type { CommandBus } from "../commands/types";
import { createQueryBus } from "../queries/bus";
import type { QueryBus } from "../queries/types";
import type { ApplicationPorts } from "../ports";
import { createCommandHandlers } from "./command";
import { createQueryHandlers } from "./query";

export interface ApplicationLayer {
  commandBus: CommandBus;
  queryBus: QueryBus;
  ports: ApplicationPorts;
}

export function createApplicationLayer(ports: ApplicationPorts): ApplicationLayer {
  const commandBus = createCommandBus();
  const queryBus = createQueryBus();
  for (const handler of createCommandHandlers(ports)) {
    commandBus.register(handler);
  }
  for (const handler of createQueryHandlers(ports)) {
    queryBus.register(handler);
  }
  return { commandBus, queryBus, ports };
}

export * from "./command";
export * from "./query";
export * from "./shared/pipeline";
