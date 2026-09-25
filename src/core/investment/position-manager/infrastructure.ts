import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import type {
  BrokerPositionAdapter,
  BrokerPositionSnapshot,
  ExitOrderRecord,
  ExitOrderRegistry,
  PositionEventLog,
  PositionStateRepository,
} from "./application";
import type { PositionManagerEvent, PositionSnapshot } from "./domain";

export class InMemoryPositionStateRepository implements PositionStateRepository {
  private readonly positions = new Map<string, PositionSnapshot>();

  async getById(positionId: string): Promise<PositionSnapshot | undefined> {
    return this.positions.get(positionId);
  }

  async listAll(): Promise<readonly PositionSnapshot[]> {
    return Array.from(this.positions.values());
  }

  async upsert(position: PositionSnapshot): Promise<void> {
    this.positions.set(position.positionId, position);
  }
}

export class InMemoryPositionEventLog implements PositionEventLog {
  private readonly events: PositionManagerEvent[] = [];

  async append(event: PositionManagerEvent): Promise<void> {
    this.events.push(event);
  }

  async listByPosition(positionId: string): Promise<readonly PositionManagerEvent[]> {
    return this.events.filter((event) => event.positionId === positionId);
  }
}

export class InMemoryExitOrderRegistry implements ExitOrderRegistry {
  private readonly byPosition = new Map<string, ExitOrderRecord>();

  async findOpenByPosition(positionId: string): Promise<ExitOrderRecord | undefined> {
    const order = this.byPosition.get(positionId);
    if (!order) return undefined;
    if (order.status === "FILLED" || order.status === "CANCELLED" || order.status === "REJECTED") {
      return undefined;
    }
    return order;
  }

  async save(order: ExitOrderRecord): Promise<void> {
    this.byPosition.set(order.positionId, order);
  }
}

type BrokerPositionWire = {
  id?: string;
  positionId?: string;
  symbol?: string;
  quantity?: number;
  averagePrice?: number;
};

export class BrokerEnginePositionAdapter implements BrokerPositionAdapter {
  constructor(private readonly brokerEngine: BrokerEngine) {}

  async fetchOpenPositions(): Promise<readonly BrokerPositionSnapshot[]> {
    const raw = await this.brokerEngine.request<readonly BrokerPositionWire[]>({
      method: "GET",
      path: "/positions",
    });
    return raw
      .map((row): BrokerPositionSnapshot | null => {
        const positionId = row.positionId ?? row.id;
        if (!positionId || !row.symbol || typeof row.quantity !== "number" || typeof row.averagePrice !== "number") {
          return null;
        }
        return {
          positionId,
          symbol: row.symbol,
          quantity: row.quantity,
          averagePrice: row.averagePrice,
          source: "BROKER",
        };
      })
      .filter((row): row is BrokerPositionSnapshot => Boolean(row));
  }
}

