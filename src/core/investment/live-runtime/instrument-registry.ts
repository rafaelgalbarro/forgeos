import type { InstrumentDefinition } from "./types";

export class InstrumentRegistry {
  private readonly items = new Map<string, InstrumentDefinition>();
  private readonly openState = new Map<string, boolean>();

  upsert(instrument: InstrumentDefinition): void {
    this.items.set(instrument.id, instrument);
  }

  remove(instrumentId: string): void {
    this.items.delete(instrumentId);
    this.openState.delete(instrumentId);
  }

  list(): readonly InstrumentDefinition[] {
    return [...this.items.values()];
  }

  get(instrumentId: string): InstrumentDefinition | undefined {
    return this.items.get(instrumentId);
  }

  setOpenState(instrumentId: string, isOpen: boolean): void {
    if (!this.items.has(instrumentId)) return;
    this.openState.set(instrumentId, isOpen);
  }

  isOpen(instrumentId: string): boolean {
    return this.openState.get(instrumentId) ?? false;
  }
}
