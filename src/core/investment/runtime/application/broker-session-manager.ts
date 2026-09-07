export type BrokerSessionChannel = "data" | "management";

export type BrokerSessionRequest = {
  readonly path: string;
  readonly method: string;
  readonly queryString?: string;
  readonly body?: string;
};

export type BrokerSessionTransport = {
  request<T>(request: BrokerSessionRequest): Promise<T>;
};

/**
 * Read-only broker session manager.
 * Explicitly rejects any order channel / order path — analysis/observation only.
 * Connection lifecycle events are owned by RuntimeSupervisor (MarketEventBus).
 */
export class BrokerSessionManager {
  private connected = false;

  constructor(private readonly transport: BrokerSessionTransport) {}

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Hard block: Live Market Runtime never sends orders.
   */
  assertNoOrderPath(channel: string): void {
    const normalized = channel.toLowerCase();
    if (normalized === "orders" || normalized === "order" || normalized.includes("order")) {
      throw new Error("BrokerSessionManager rejects order path — Live Market Runtime is observation-only.");
    }
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  markConnection(state: boolean): void {
    this.connected = state;
  }

  async requestData<T>(request: BrokerSessionRequest): Promise<T> {
    this.assertNoOrderPath(request.path);
    this.assertNoOrderPath(request.method);
    if (!this.connected) {
      throw new Error("Broker session is disconnected.");
    }
    return this.transport.request<T>(request);
  }

  async requestManagement<T>(request: BrokerSessionRequest): Promise<T> {
    this.assertNoOrderPath(request.path);
    this.assertNoOrderPath(request.method);
    if (!this.connected) {
      throw new Error("Broker session is disconnected.");
    }
    return this.transport.request<T>(request);
  }

  /**
   * Intentionally unimplemented order API — always throws.
   */
  sendOrder(_request: unknown): never {
    throw new Error("ORDER_PATH_BLOCKED: Live Market Runtime must not send orders.");
  }

  recover(connected: boolean): void {
    this.connected = connected;
  }
}
