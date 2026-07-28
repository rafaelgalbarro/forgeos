/** Timeline events repository — Program 3000 Sprint 3. */

import type { TimelineEvent } from "@/lib/venture-timeline/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type ITimelineRepository } from "../types";
import { MapRepository } from "./base-repository";

export class TimelineRepository
  extends MapRepository<TimelineEvent[]>
  implements ITimelineRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.timeline);
  }

  async getByVenture(ventureId: string): Promise<TimelineEvent[]> {
    return (await this.get(ventureId)) ?? [];
  }

  async saveEvents(
    ventureId: string,
    events: TimelineEvent[]
  ): Promise<TimelineEvent[]> {
    await this.set(ventureId, events);
    return events;
  }

  async appendEvent(event: TimelineEvent): Promise<TimelineEvent> {
    const events = await this.getByVenture(event.ventureId);
    const i = events.findIndex((e) => e.id === event.id);
    if (i >= 0) events[i] = event;
    else events.push(event);
    await this.set(event.ventureId, events);
    return event;
  }

  async deleteByVenture(ventureId: string): Promise<boolean> {
    return super.delete(ventureId);
  }
}
