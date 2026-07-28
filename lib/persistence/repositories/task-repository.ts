/** Scheduler tasks repository — Program 3000 Sprint 3. */

import type { SchedulerTask } from "@/lib/runtime/scheduler/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type ITaskRepository } from "../types";
import { ListRepository } from "./base-repository";

export class TaskRepository
  extends ListRepository<SchedulerTask>
  implements ITaskRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.tasks);
  }

  async findByVenture(ventureId: string): Promise<SchedulerTask[]> {
    return (await this.findAll()).filter((t) => t.ventureId === ventureId);
  }

  async findByStatus(
    status: SchedulerTask["status"]
  ): Promise<SchedulerTask[]> {
    return (await this.findAll()).filter((t) => t.status === status);
  }
}
